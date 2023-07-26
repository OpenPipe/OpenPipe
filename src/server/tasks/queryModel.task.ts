import { type Prisma } from "@prisma/client";
import { type JsonObject } from "type-fest";
import modelProviders from "~/modelProviders/modelProviders";
import { prisma } from "~/server/db";
import { wsConnection } from "~/utils/wsConnection";
import { runEvalsForOutput } from "../utils/evaluations";
import hashPrompt from "../utils/hashPrompt";
import parseConstructFn from "../utils/parseConstructFn";
import { sleep } from "../utils/sleep";
import defineTask from "./defineTask";

export type QueryModelJob = {
  cellId: string;
  stream: boolean;
};

const MAX_AUTO_RETRIES = 10;
const MIN_DELAY = 500; // milliseconds
const MAX_DELAY = 15000; // milliseconds

function calculateDelay(numPreviousTries: number): number {
  const baseDelay = Math.min(MAX_DELAY, MIN_DELAY * Math.pow(2, numPreviousTries));
  const jitter = Math.random() * baseDelay;
  return baseDelay + jitter;
}

export const queryModel = defineTask<QueryModelJob>("queryModel", async (task) => {
  console.log("RUNNING TASK", task);
  const { cellId, stream } = task;
  const cell = await prisma.scenarioVariantCell.findUnique({
    where: { id: cellId },
    include: { modelResponses: true },
  });
  if (!cell) {
    return;
  }

  // If cell is not pending, then some other job is already processing it
  if (cell.retrievalStatus !== "PENDING") {
    return;
  }
  await prisma.scenarioVariantCell.update({
    where: { id: cellId },
    data: {
      retrievalStatus: "IN_PROGRESS",
      jobStartedAt: new Date(),
    },
  });

  const variant = await prisma.promptVariant.findUnique({
    where: { id: cell.promptVariantId },
  });
  if (!variant) {
    await prisma.scenarioVariantCell.update({
      where: { id: cellId },
      data: {
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
      where: { id: cellId },
      data: {
        errorMessage: "Scenario not found",
        retrievalStatus: "ERROR",
      },
    });
    return;
  }

  const prompt = await parseConstructFn(variant.constructFn, scenario.variableValues as JsonObject);

  if ("error" in prompt) {
    await prisma.scenarioVariantCell.update({
      where: { id: cellId },
      data: {
        errorMessage: prompt.error,
        retrievalStatus: "ERROR",
      },
    });
    return;
  }

  const provider = modelProviders[prompt.modelProvider];

  const onStream = stream
    ? (partialOutput: (typeof provider)["_outputSchema"]) => {
        wsConnection.emit("message", { channel: cell.id, payload: partialOutput });
      }
    : null;

  const inputHash = hashPrompt(prompt);

  for (let i = 0; true; i++) {
    let modelResponse = await prisma.modelResponse.create({
      data: {
        inputHash,
        scenarioVariantCellId: cellId,
        requestedAt: new Date(),
      },
    });
    const response = await provider.getCompletion(prompt.modelInput, onStream);
    if (response.type === "success") {
      modelResponse = await prisma.modelResponse.update({
        where: { id: modelResponse.id },
        data: {
          output: response.value as Prisma.InputJsonObject,
          statusCode: response.statusCode,
          receivedAt: new Date(),
          promptTokens: response.promptTokens,
          completionTokens: response.completionTokens,
          cost: response.cost,
        },
      });

      await prisma.scenarioVariantCell.update({
        where: { id: cellId },
        data: {
          retrievalStatus: "COMPLETE",
        },
      });

      await runEvalsForOutput(variant.experimentId, scenario, modelResponse, prompt.modelProvider);
      break;
    } else {
      const shouldRetry = response.autoRetry && i < MAX_AUTO_RETRIES;
      const delay = calculateDelay(i);

      await prisma.modelResponse.update({
        where: { id: modelResponse.id },
        data: {
          statusCode: response.statusCode,
          errorMessage: response.message,
          receivedAt: new Date(),
          retryTime: shouldRetry ? new Date(Date.now() + delay) : null,
        },
      });

      if (shouldRetry) {
        await sleep(delay);
      } else {
        await prisma.scenarioVariantCell.update({
          where: { id: cellId },
          data: {
            retrievalStatus: "ERROR",
          },
        });
        break;
      }
    }
  }
});

export const queueQueryModel = async (cellId: string, stream: boolean) => {
  await Promise.all([
    prisma.scenarioVariantCell.update({
      where: {
        id: cellId,
      },
      data: {
        retrievalStatus: "PENDING",
        errorMessage: null,
        jobQueuedAt: new Date(),
      },
    }),
    queryModel.enqueue({ cellId, stream }),
  ]);
};
