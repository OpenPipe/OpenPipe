import { type Prisma } from "@prisma/client";
import { type JsonValue } from "type-fest";
import { type ChatCompletionMessage } from "openai/resources/chat";

import { prisma } from "~/server/db";
import hashObject from "../utils/hashObject";
import defineTask from "./defineTask";
import { formatInputMessages, getCompletion } from "~/modelProviders/fine-tuned/getCompletion";
import { countLlamaChatTokens, countLlamaChatTokensInMessages } from "~/utils/countTokens";

export type GetTestResultJob = {
  fineTuneId: string;
  datasetEntryId: string;
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
  const { fineTuneId, datasetEntryId, numPreviousTries } = task;

  const [fineTune, datasetEntry] = await prisma.$transaction([
    prisma.fineTune.findUnique({
      where: { id: fineTuneId },
      include: {
        pruningRules: {
          select: {
            textToMatch: true,
          },
        },
      },
    }),
    prisma.datasetEntry.findUnique({
      where: { id: datasetEntryId },
    }),
  ]);

  if (!fineTune || !datasetEntry) return;

  let testEntry = await prisma.fineTuneTestingEntry.findUnique({
    where: { fineTuneId_datasetEntryId: { fineTuneId, datasetEntryId } },
  });

  const stringsToPrune = fineTune.pruningRules.map((rule) => rule.textToMatch);

  if (!testEntry) {
    testEntry = await prisma.fineTuneTestingEntry.create({
      data: {
        fineTuneId,
        datasetEntryId,
        inputTokens: countLlamaChatTokens(
          formatInputMessages(
            datasetEntry.input as unknown as ChatCompletionMessage[],
            stringsToPrune,
          ),
        ),
      },
    });
  }

  const cacheKey = hashObject({
    fineTuneId,
    input: datasetEntry.input,
  } as JsonValue);

  const existingResponse = await prisma.fineTuneResponse.findFirst({
    where: { cacheKey },
  });

  if (existingResponse) {
    await prisma.fineTuneTestingEntry.update({
      where: { id: testEntry.id },
      data: {
        responseId: existingResponse.id,
      },
    });
    return;
  }

  let shouldRetry = false;
  let completion;
  let newResponse;
  try {
    completion = await getCompletion(
      {
        model: `openpipe:${fineTune.slug}`,
        messages: datasetEntry.input as unknown as ChatCompletionMessage[],
      },
      fineTune.inferenceUrls,
      stringsToPrune,
    );
    const completionMessage = completion.choices[0]?.message;
    if (!completionMessage) throw new Error("No completion returned");
    newResponse = await prisma.fineTuneResponse.create({
      data: {
        cacheKey,
        output: completionMessage as unknown as Prisma.InputJsonValue,
        outputTokens: countLlamaChatTokensInMessages([completionMessage]),
      },
    });
  } catch (e) {
    console.log("this error is", e);
    newResponse = await prisma.fineTuneResponse.create({
      data: {
        errorMessage: (e as Error).message,
      },
    });
    shouldRetry = true;
  }

  await prisma.fineTuneTestingEntry.update({
    where: { id: testEntry.id },
    data: {
      responseId: newResponse.id,
    },
  });

  if (shouldRetry && numPreviousTries < MAX_AUTO_RETRIES) {
    const delay = calculateDelay(numPreviousTries);
    const retryTime = new Date(Date.now() + delay);
    await getTestResult.enqueue(
      {
        fineTuneId,
        datasetEntryId,
        numPreviousTries: numPreviousTries + 1,
      },
      { runAt: retryTime, jobKey: formatJobKey(fineTuneId, datasetEntryId), priority: 3 },
    );
  }
});

export const queueGetTestResult = async (fineTuneId: string, datasetEntryId: string) => {
  await getTestResult.enqueue(
    { fineTuneId, datasetEntryId, numPreviousTries: 0 },
    { jobKey: formatJobKey(fineTuneId, datasetEntryId) },
  );
};

const formatJobKey = (fineTuneId: string, datasetEntryId: string) =>
  `${fineTuneId}-${datasetEntryId}`;
