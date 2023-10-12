import { type Prisma } from "@prisma/client";
import { type JsonValue } from "type-fest";
import { type ChatCompletionMessage } from "openai/resources/chat";

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
import { validatedChatInput } from "~/modelProviders/fine-tuned/utils";

export type GetTestResultJob = {
  fineTuneId: string;
  datasetEntryId: string;
  skipCache: boolean;
};

export const getTestResult = defineTask<GetTestResultJob>("getTestResult", async (task) => {
  const { fineTuneId, datasetEntryId, skipCache } = task;

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

  let prunedMessages = existingTestEntry?.prunedInput;

  const stringsToPrune = await getStringsToPrune(fineTune.id);
  if (!existingTestEntry) {
    prunedMessages = pruneInputMessagesStringified(
      datasetEntry.messages as unknown as ChatCompletionMessage[],
      stringsToPrune,
    );
    await prisma.fineTuneTestingEntry.create({
      data: {
        fineTuneId,
        datasetEntryId,
        prunedInput: prunedMessages,
        // TODO: need to count tokens based on the full input, not just messages
        prunedInputTokens: countLlamaChatTokens(prunedMessages),
      },
    });
  }

  const cacheKey = hashObject({
    fineTuneId,
    input: prunedMessages,
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

  let completion;
  const input = {
    model: `openpipe:${fineTune.slug}`,
    ...validatedChatInput(datasetEntry),
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
    } else if (fineTune.pipelineVersion === 1 || fineTune.pipelineVersion === 2) {
      completion = await getCompletion2(fineTune, input);
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
    await prisma.fineTuneTestingEntry.update({
      where: { fineTuneId_datasetEntryId: { fineTuneId, datasetEntryId } },
      data: {
        errorMessage: (e as Error).message,
      },
    });
    throw e;
  }
});

export const queueGetTestResult = async (
  fineTuneId: string,
  datasetEntryId: string,
  skipCache = false,
) => {
  await getTestResult.enqueue(
    { fineTuneId, datasetEntryId, skipCache },
    { priority: 5, maxAttempts: 10 },
  );
};
