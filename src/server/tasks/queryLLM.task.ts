import crypto from "crypto";
import { prisma } from "~/server/db";
import defineTask from "./defineTask";
import { type CompletionResponse, getCompletion } from "../utils/getCompletion";
import { type JSONSerializable } from "../types";
import { sleep } from "../utils/sleep";
import { shouldStream } from "../utils/shouldStream";
import { generateChannel } from "~/utils/generateChannel";
import { reevaluateVariant } from "../utils/evaluations";
import { constructPrompt } from "../utils/constructPrompt";

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
  for (let i = 0; i < MAX_AUTO_RETRIES; i++) {
    const modelResponse = await getCompletion(payload, channel);
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
    await sleep(delay);
  }
  throw new Error("Max retries limit reached");
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
    return;
  }

  // If cell is not pending, then some other job is already processing it
  if (cell.retrievalStatus !== "PENDING") {
    throw new Error("Cell is not pending");
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
    return;
  }

  const scenario = await prisma.testScenario.findUnique({
    where: { id: cell.testScenarioId },
  });
  if (!scenario) {
    return;
  }

  const prompt = await constructPrompt(variant, scenario);

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
        output: modelResponse.output,
        timeToComplete: modelResponse.timeToComplete,
        promptTokens: modelResponse.promptTokens,
        completionTokens: modelResponse.completionTokens,
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

  await reevaluateVariant(cell.promptVariantId);
});
