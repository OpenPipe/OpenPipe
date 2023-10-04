import { type Prisma } from "@prisma/client";
import { type JsonValue } from "type-fest";
import { type ChatCompletionMessage } from "openai/resources/chat";
import { APIError } from "openai/error";

import { prisma } from "~/server/db";
import hashObject from "~/server/utils/hashObject";
import defineTask from "./defineTask";
import {
  pruneInputMessagesStringified,
  getCompletion,
  getStringsToPrune,
} from "~/modelProviders/fine-tuned/getCompletion";
import { countLlamaChatTokens, countLlamaChatTokensInMessages } from "~/utils/countTokens";
import { getCompletion2 } from "~/modelProviders/fine-tuned/getCompletion-2";
import { calculateEntryScore } from "../utils/calculateEntryScore";

export type GetTestResultJob = {
  fineTuneId: string;
  datasetEntryId: string;
  skipCache: boolean;
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

export const getTestResult = defineTask<GetTestResultJob>("getTestResult", async (task) => {
  const { fineTuneId, datasetEntryId, skipCache, numPreviousTries } = task;

  const [fineTune, datasetEntry] = await prisma.$transaction([
    prisma.fineTune.findUnique({
      where: { id: fineTuneId },
    }),
    prisma.datasetEntry.findUnique({
      where: { id: datasetEntryId },
    }),
  ]);

  if (!fineTune || !datasetEntry) return;

  const existingTestEntry = await prisma.fineTuneTestingEntry.findUnique({
    where: { fineTuneId_datasetEntryId: { fineTuneId, datasetEntryId } },
  });

  if (existingTestEntry?.output && !skipCache) return;

  let prunedInput = existingTestEntry?.prunedInput;

  const stringsToPrune = await getStringsToPrune(fineTune.id);
  if (!existingTestEntry) {
    prunedInput = pruneInputMessagesStringified(
      datasetEntry.input as unknown as ChatCompletionMessage[],
      stringsToPrune,
    );
    await prisma.fineTuneTestingEntry.create({
      data: {
        fineTuneId,
        datasetEntryId,
        prunedInputTokens: countLlamaChatTokens(prunedInput),
        prunedInput: prunedInput,
      },
    });
  }

  const cacheKey = hashObject({
    fineTuneId,
    input: prunedInput,
  } as JsonValue);

  if (!skipCache) {
    const matchingTestEntry = await prisma.fineTuneTestingEntry.findFirst({
      where: {
        cacheKey,
      },
    });

    if (matchingTestEntry?.output) {
      await prisma.fineTuneTestingEntry.update({
        where: { fineTuneId_datasetEntryId: { fineTuneId, datasetEntryId } },
        data: {
          output: matchingTestEntry.output,
          outputTokens: matchingTestEntry.outputTokens,
          errorMessage: null,
        },
      });
      return;
    }
  }

  let shouldRetry = false;
  let completion;
  const input = {
    model: `openpipe:${fineTune.slug}`,
    messages: datasetEntry.input as unknown as ChatCompletionMessage[],
  };
  try {
    if (fineTune.pipelineVersion === 0) {
      if (!fineTune.inferenceUrls.length) {
        await prisma.fineTuneTestingEntry.update({
          where: { fineTuneId_datasetEntryId: { fineTuneId, datasetEntryId } },
          data: {
            errorMessage: "The model is not set up for inference",
          },
        });
        return;
      }

      completion = await getCompletion(input, fineTune.inferenceUrls, stringsToPrune);
    } else if (fineTune.pipelineVersion === 1) {
      completion = await getCompletion2(fineTune, input, stringsToPrune);
    } else {
      await prisma.fineTuneTestingEntry.update({
        where: { fineTuneId_datasetEntryId: { fineTuneId, datasetEntryId } },
        data: {
          errorMessage: "The model is not set up for inference",
        },
      });
      return;
    }

    const completionMessage = completion.choices[0]?.message;
    if (!completionMessage) throw new Error("No completion returned");
    let score;
    const originalOutput = datasetEntry.output as unknown as ChatCompletionMessage;
    if (originalOutput.function_call) {
      score = calculateEntryScore(originalOutput.function_call, completionMessage.function_call);
    }
    const outputTokens = countLlamaChatTokensInMessages([completionMessage]);
    await prisma.fineTuneTestingEntry.update({
      where: { fineTuneId_datasetEntryId: { fineTuneId, datasetEntryId } },
      data: {
        cacheKey,
        output: completionMessage as unknown as Prisma.InputJsonValue,
        outputTokens,
        score,
        errorMessage: null,
      },
    });
  } catch (e) {
    if (e instanceof APIError) {
      shouldRetry = e.status === 429 && numPreviousTries < MAX_AUTO_RETRIES;
    }
    await prisma.fineTuneTestingEntry.update({
      where: { fineTuneId_datasetEntryId: { fineTuneId, datasetEntryId } },
      data: {
        errorMessage: (e as Error).message,
      },
    });
  }

  if (shouldRetry) {
    const delay = calculateDelay(numPreviousTries);
    const retryTime = new Date(Date.now() + delay);
    await getTestResult.enqueue(
      {
        fineTuneId,
        datasetEntryId,
        skipCache,
        numPreviousTries: numPreviousTries + 1,
      },
      { runAt: retryTime, priority: 3 },
    );
  }
});

export const queueGetTestResult = async (
  fineTuneId: string,
  datasetEntryId: string,
  skipCache = false,
) => {
  await getTestResult.enqueue(
    { fineTuneId, datasetEntryId, skipCache, numPreviousTries: 0 },
    { priority: 5 },
  );
};
