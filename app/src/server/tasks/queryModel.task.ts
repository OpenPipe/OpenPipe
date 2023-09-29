import { type Prisma } from "@prisma/client";
import { type JsonValue, type JsonObject } from "type-fest";
import modelProviders from "~/modelProviders/modelProviders";
import { prisma } from "~/server/db";
import { wsConnection } from "~/utils/wsConnection";
import { runEvalsForOutput } from "../utils/evaluations";
import hashObject from "~/utils/hashObject";
import defineTask from "./defineTask";
import parsePromptConstructor from "~/promptConstructor/parse";

export type QueryModelJob = {
  cellId: string;
  stream: boolean;
  numPreviousTries: number;
};

const MAX_AUTO_RETRIES = 50;
const MIN_DELAY = 500; // milliseconds
const MAX_DELAY = 15000; // milliseconds

function calculateDelay(numPreviousTries: number): number {
  const baseDelay = Math.min(MAX_DELAY, MIN_DELAY * Math.pow(2, numPreviousTries));
  const jitter = Math.random() * baseDelay;
  return baseDelay + jitter;
}

export const queryModel = defineTask<QueryModelJob>("queryModel", async (task) => {
  const { cellId, stream, numPreviousTries } = task;
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

  const prompt = await parsePromptConstructor(
    variant.promptConstructor,
    scenario.variableValues as JsonObject,
  );

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

  const cacheKey = hashObject(prompt as JsonValue);

  let modelResponse = await prisma.modelResponse.create({
    data: {
      cacheKey,
      scenarioVariantCellId: cellId,
      requestedAt: new Date(),
    },
  });
  const response = await provider.getCompletion(prompt.modelInput, onStream);
  if (response.type === "success") {
    const usage = provider.getUsage(prompt.modelInput, response.value);
    modelResponse = await prisma.modelResponse.update({
      where: { id: modelResponse.id },
      data: {
        respPayload: response.value as Prisma.InputJsonObject,
        statusCode: response.statusCode,
        receivedAt: new Date(),
        inputTokens: usage?.inputTokens,
        outputTokens: usage?.outputTokens,
        cost: usage?.cost,
      },
    });

    await prisma.scenarioVariantCell.update({
      where: { id: cellId },
      data: {
        retrievalStatus: "COMPLETE",
      },
    });

    await runEvalsForOutput(variant.experimentId, scenario, modelResponse, prompt.modelProvider);
  } else {
    const shouldRetry = response.autoRetry && numPreviousTries < MAX_AUTO_RETRIES;
    const delay = calculateDelay(numPreviousTries);
    const retryTime = new Date(Date.now() + delay);

    await prisma.modelResponse.update({
      where: { id: modelResponse.id },
      data: {
        statusCode: response.statusCode,
        errorMessage: response.message,
        receivedAt: new Date(),
        retryTime: shouldRetry ? retryTime : null,
      },
    });

    if (shouldRetry) {
      await queryModel.enqueue(
        {
          cellId,
          stream,
          numPreviousTries: numPreviousTries + 1,
        },
        { runAt: retryTime, jobKey: cellId, priority: 3 },
      );
      await prisma.scenarioVariantCell.update({
        where: { id: cellId },
        data: {
          retrievalStatus: "PENDING",
        },
      });
    } else {
      await prisma.scenarioVariantCell.update({
        where: { id: cellId },
        data: {
          retrievalStatus: "ERROR",
        },
      });
    }
  }
});

export const queueQueryModel = async (
  cellId: string,
  options: { stream?: boolean; hardRefetch?: boolean } = {},
) => {
  // Hard refetches are higher priority than streamed queries, which are higher priority than non-streamed queries.
  const jobPriority = options.hardRefetch ? 0 : options.stream ? 1 : 2;

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

    queryModel.enqueue(
      { cellId, stream: options.stream ?? false, numPreviousTries: 0 },

      // Streamed queries are higher priority than non-streamed queries. Lower
      // numbers are higher priority in graphile-worker.
      { jobKey: cellId, priority: jobPriority },
    ),
  ]);
};
