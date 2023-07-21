import { prisma } from "~/server/db";
import defineTask from "./defineTask";
import { sleep } from "../utils/sleep";
import { generateChannel } from "~/utils/generateChannel";
import { runEvalsForOutput } from "../utils/evaluations";
import { type Prisma } from "@prisma/client";
import parseConstructFn from "../utils/parseConstructFn";
import hashPrompt from "../utils/hashPrompt";
import { type JsonObject } from "type-fest";
import modelProviders from "~/modelProviders/modelProviders";
import { wsConnection } from "~/utils/wsConnection";

export type queryLLMJob = {
  scenarioVariantCellId: string;
};

const MAX_AUTO_RETRIES = 10;
const MIN_DELAY = 500; // milliseconds
const MAX_DELAY = 15000; // milliseconds

function calculateDelay(numPreviousTries: number): number {
  const baseDelay = Math.min(MAX_DELAY, MIN_DELAY * Math.pow(2, numPreviousTries));
  const jitter = Math.random() * baseDelay;
  return baseDelay + jitter;
}

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

  const prompt = await parseConstructFn(variant.constructFn, scenario.variableValues as JsonObject);

  if ("error" in prompt) {
    await prisma.scenarioVariantCell.update({
      where: { id: scenarioVariantCellId },
      data: {
        statusCode: 400,
        errorMessage: prompt.error,
        retrievalStatus: "ERROR",
      },
    });
    return;
  }

  const provider = modelProviders[prompt.modelProvider];

  const streamingChannel = provider.shouldStream(prompt.modelInput) ? generateChannel() : null;

  if (streamingChannel) {
    // Save streaming channel so that UI can connect to it
    await prisma.scenarioVariantCell.update({
      where: { id: scenarioVariantCellId },
      data: { streamingChannel },
    });
  }
  const onStream = streamingChannel
    ? (partialOutput: (typeof provider)["_outputSchema"]) => {
        wsConnection.emit("message", { channel: streamingChannel, payload: partialOutput });
      }
    : null;

  for (let i = 0; true; i++) {
    const response = await provider.getCompletion(prompt.modelInput, onStream);
    if (response.type === "success") {
      const inputHash = hashPrompt(prompt);

      const modelOutput = await prisma.modelOutput.create({
        data: {
          scenarioVariantCellId,
          inputHash,
          output: response.value as unknown as Prisma.InputJsonObject,
          timeToComplete: response.timeToComplete,
          promptTokens: response.promptTokens,
          completionTokens: response.completionTokens,
          cost: response.cost,
        },
      });

      await prisma.scenarioVariantCell.update({
        where: { id: scenarioVariantCellId },
        data: {
          statusCode: response.statusCode,
          retrievalStatus: "COMPLETE",
        },
      });

      await runEvalsForOutput(variant.experimentId, scenario, modelOutput);
      break;
    } else {
      const shouldRetry = response.autoRetry && i < MAX_AUTO_RETRIES;
      const delay = calculateDelay(i);

      await prisma.scenarioVariantCell.update({
        where: { id: scenarioVariantCellId },
        data: {
          errorMessage: response.message,
          statusCode: response.statusCode,
          retryTime: shouldRetry ? new Date(Date.now() + delay) : null,
          retrievalStatus: shouldRetry ? "PENDING" : "ERROR",
        },
      });

      if (shouldRetry) {
        await sleep(delay);
      } else {
        break;
      }
    }
  }
});
