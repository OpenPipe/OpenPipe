import { type ComparisonModel, type Prisma } from "@prisma/client";
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
import { getComparisonModelName, isComparisonModel } from "~/utils/baseModels";
import { getOpenaiCompletion } from "../utils/openai";

export type EvaluateTestSetEntryJob = {
  modelId: string;
  datasetEntryId: string;
  skipCache?: boolean;
};

export const evaluateTestSetEntry = defineTask<EvaluateTestSetEntryJob>({
  id: "evaluateTestSetEntry",
  handler: async (task) => {
    const { modelId, datasetEntryId, skipCache } = task;

    const rawDatasetEntry = await prisma.datasetEntry.findUnique({
      where: { id: datasetEntryId },
      include: {
        dataset: {
          include: {
            project: true,
          },
        },
      },
    });

    if (!rawDatasetEntry?.dataset) return;

    let fineTune;
    if (!isComparisonModel(modelId)) {
      fineTune = await prisma.fineTune.findUnique({
        where: { id: modelId },
      });
    }

    const datasetEntry = typedDatasetEntry(rawDatasetEntry);

    const existingTestEntry = await prisma.fineTuneTestingEntry.findUnique({
      where: { modelId_datasetEntryId: { modelId, datasetEntryId } },
    });

    if (existingTestEntry?.output && !skipCache) return;

    let prunedMessages = existingTestEntry?.prunedInput;

    const stringsToPrune = await getStringsToPrune(modelId);
    if (!existingTestEntry) {
      prunedMessages = pruneInputMessagesStringified(datasetEntry.messages, stringsToPrune);
      await prisma.fineTuneTestingEntry.create({
        data: {
          modelId,
          datasetEntryId,
          prunedInput: prunedMessages,
          // TODO: need to count tokens based on the full input, not just messages
          prunedInputTokens: countLlamaChatTokens(prunedMessages),
        },
      });
    }

    const cacheKey = hashObject({
      modelId,
      input: prunedMessages,
      function_call: datasetEntry.function_call,
      functions: datasetEntry.functions,
    } as JsonValue);

    if (!skipCache) {
      const matchingTestEntry = await prisma.fineTuneTestingEntry.findFirst({
        where: {
          cacheKey,
        },
      });

      if (matchingTestEntry?.output) {
        await prisma.fineTuneTestingEntry.update({
          where: { modelId_datasetEntryId: { modelId, datasetEntryId } },
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
      model: fineTune
        ? `openpipe:${fineTune.slug}`
        : getComparisonModelName(modelId as ComparisonModel),
      messages: datasetEntry.messages,
      function_call: datasetEntry.function_call ?? undefined,
      functions: datasetEntry.functions ?? undefined,
    };
    try {
      if (isComparisonModel(modelId)) {
        completion = await getOpenaiCompletion(
          rawDatasetEntry.dataset.projectId,
          getComparisonModelName(modelId as ComparisonModel),
          input,
        );
      } else if (fineTune && (fineTune.pipelineVersion === 1 || fineTune.pipelineVersion === 2)) {
        completion = await getCompletion2(fineTune, input);
      } else {
        await prisma.fineTuneTestingEntry.update({
          where: { modelId_datasetEntryId: { modelId, datasetEntryId } },
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
        where: { modelId_datasetEntryId: { modelId, datasetEntryId } },
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
        where: { modelId_datasetEntryId: { modelId, datasetEntryId } },
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
