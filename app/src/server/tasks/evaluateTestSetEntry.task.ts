import { type Prisma } from "@prisma/client";
import { type JsonValue } from "type-fest";

import { prisma } from "~/server/db";
import hashObject from "~/server/utils/hashObject";
import defineTask from "./defineTask";
import {
  pruneInputMessagesStringified,
  getStringsToPrune,
} from "~/modelProviders/fine-tuned/getCompletion";
import { countLlamaChatTokens, countLlamaChatTokensInMessages } from "~/utils/countTokens";
import { getCompletion2 } from "~/modelProviders/fine-tuned/getCompletion-2";
import { calculateEntryScore } from "../utils/calculateEntryScore";
import { typedDatasetEntry } from "~/types/dbColumns.types";

export type EvaluateTestSetEntryJob = {
  fineTuneId: string;
  datasetEntryId: string;
  skipCache?: boolean;
};

export const evaluateTestSetEntry = defineTask<EvaluateTestSetEntryJob>({
  id: "evaluateTestSetEntry",
  handler: async (task) => {
    const { fineTuneId, datasetEntryId, skipCache } = task;

    const [fineTune, rawDatasetEntry] = await prisma.$transaction([
      prisma.fineTune.findUnique({
        where: { id: fineTuneId },
      }),
      prisma.datasetEntry.findUnique({
        where: { id: datasetEntryId },
      }),
    ]);

    if (!fineTune || !rawDatasetEntry) return;

    const datasetEntry = typedDatasetEntry(rawDatasetEntry);

    const existingTestEntry = await prisma.fineTuneTestingEntry.findUnique({
      where: { fineTuneId_datasetEntryId: { fineTuneId, datasetEntryId } },
    });

    if (existingTestEntry?.output && !skipCache) return;

    let prunedMessages = existingTestEntry?.prunedInput;

    const stringsToPrune = await getStringsToPrune(fineTune.id);
    if (!existingTestEntry) {
      prunedMessages = pruneInputMessagesStringified(datasetEntry.messages, stringsToPrune);
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
      messages: datasetEntry.messages,
      function_call: datasetEntry.function_call ?? undefined,
      functions: datasetEntry.functions ?? undefined,
    };
    try {
      if (fineTune.pipelineVersion === 1 || fineTune.pipelineVersion === 2) {
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
      if (datasetEntry.output?.function_call) {
        score = calculateEntryScore(
          datasetEntry.output.function_call,
          completionMessage.function_call,
        );
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
  },
  specDefaults: {
    priority: 5,
  },
});
