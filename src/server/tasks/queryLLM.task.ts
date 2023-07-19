import crypto from "crypto";
import { prisma } from "~/server/db";
import defineTask from "./defineTask";
import { type CompletionResponse, getOpenAIChatCompletion } from "../utils/getCompletion";
import { type JSONSerializable } from "../types";
import { sleep } from "../utils/sleep";
import { shouldStream } from "../utils/shouldStream";
import { generateChannel } from "~/utils/generateChannel";
import { runEvalsForOutput } from "../utils/evaluations";
import { constructPrompt } from "../utils/constructPrompt";
import { type CompletionCreateParams } from "openai/resources/chat";
import { type Prisma } from "@prisma/client";

const MAX_AUTO_RETRIES = 10;
const MIN_DELAY = 500; // milliseconds
const MAX_DELAY = 15000; // milliseconds

function calculateDelay(numPreviousTries: number): number {
  const baseDelay = Math.min(MAX_DELAY, MIN_DELAY * Math.pow(2, numPreviousTries));
  const jitter = Math.random() * baseDelay;
  return baseDelay + jitter;
}

const getCompletionWithRetries = async (
  cellId: string,
  payload: JSONSerializable,
  channel?: string,
): Promise<CompletionResponse> => {
  let modelResponse: CompletionResponse | null = null;
  try {
    for (let i = 0; i < MAX_AUTO_RETRIES; i++) {
      modelResponse = await getOpenAIChatCompletion(
        payload as unknown as CompletionCreateParams,
        channel,
      );
      if (modelResponse.statusCode !== 429 || i === MAX_AUTO_RETRIES - 1) {
        return modelResponse;
      }
      const delay = calculateDelay(i);
      await prisma.scenarioVariantCell.update({
        where: { id: cellId },
        data: {
          errorMessage: "Rate limit exceeded",
          statusCode: 429,
          retryTime: new Date(Date.now() + delay),
        },
      });
      // TODO: Maybe requeue the job so other jobs can run in the future?
      await sleep(delay);
    }
    throw new Error("Max retries limit reached");
  } catch (error: unknown) {
    return {
      statusCode: modelResponse?.statusCode ?? 500,
      errorMessage: modelResponse?.errorMessage ?? (error as Error).message,
      output: null,
      timeToComplete: 0,
    };
  }
};

export type queryLLMJob = {
  scenarioVariantCellId: string;
};

export const queryLLM = defineTask<queryLLMJob>("queryLLM", async (task) => {
  const { scenarioVariantCellId } = task;
  const cell = await prisma.scenarioVariantCell.findUnique({
    where: { id: scenarioVariantCellId },
    include: { modelOutput: true },
  });
  if (!cell) {
    await prisma.scenarioVariantCell.update({
      where: { id: scenarioVariantCellId },
      data: {
        statusCode: 404,
        errorMessage: "Cell not found",
        retrievalStatus: "ERROR",
      },
    });
    return;
  }

  // If cell is not pending, then some other job is already processing it
  if (cell.retrievalStatus !== "PENDING") {
    return;
  }
  await prisma.scenarioVariantCell.update({
    where: { id: scenarioVariantCellId },
    data: {
      retrievalStatus: "IN_PROGRESS",
    },
  });

  const variant = await prisma.promptVariant.findUnique({
    where: { id: cell.promptVariantId },
  });
  if (!variant) {
    await prisma.scenarioVariantCell.update({
      where: { id: scenarioVariantCellId },
      data: {
        statusCode: 404,
        errorMessage: "Prompt Variant not found",
        retrievalStatus: "ERROR",
      },
    });
    return;
  }

  const scenario = await prisma.testScenario.findUnique({
    where: { id: cell.testScenarioId },
  });
  if (!scenario) {
    await prisma.scenarioVariantCell.update({
      where: { id: scenarioVariantCellId },
      data: {
        statusCode: 404,
        errorMessage: "Scenario not found",
        retrievalStatus: "ERROR",
      },
    });
    return;
  }

  const prompt = await constructPrompt(variant, scenario.variableValues);

  const streamingEnabled = shouldStream(prompt);
  let streamingChannel;

  if (streamingEnabled) {
    streamingChannel = generateChannel();
    // Save streaming channel so that UI can connect to it
    await prisma.scenarioVariantCell.update({
      where: { id: scenarioVariantCellId },
      data: {
        streamingChannel,
      },
    });
  }

  const modelResponse = await getCompletionWithRetries(
    scenarioVariantCellId,
    prompt,
    streamingChannel,
  );

  let modelOutput = null;
  if (modelResponse.statusCode === 200) {
    const inputHash = crypto.createHash("sha256").update(JSON.stringify(prompt)).digest("hex");

    modelOutput = await prisma.modelOutput.create({
      data: {
        scenarioVariantCellId,
        inputHash,
        output: modelResponse.output as unknown as Prisma.InputJsonObject,
        timeToComplete: modelResponse.timeToComplete,
        promptTokens: modelResponse.promptTokens,
        completionTokens: modelResponse.completionTokens,
        cost: modelResponse.cost,
      },
    });
  }

  await prisma.scenarioVariantCell.update({
    where: { id: scenarioVariantCellId },
    data: {
      statusCode: modelResponse.statusCode,
      errorMessage: modelResponse.errorMessage,
      streamingChannel: null,
      retrievalStatus: modelOutput ? "COMPLETE" : "ERROR",
      modelOutput: {
        connect: {
          id: modelOutput?.id,
        },
      },
    },
  });

  if (modelOutput) {
    await runEvalsForOutput(variant.experimentId, scenario, modelOutput);
  }
});
