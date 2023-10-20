import { UsageType, type ComparisonModel, type Prisma } from "@prisma/client";
import { type JsonValue } from "type-fest";

import { prisma } from "~/server/db";
import hashObject from "~/server/utils/hashObject";
import defineTask from "./defineTask";
import { pruneInputMessages, getStringsToPrune } from "~/modelProviders/fine-tuned/getCompletion";
import { getCompletion2 } from "~/modelProviders/fine-tuned/getCompletion-2";
import { calculateEntryScore } from "../utils/calculateEntryScore";
import { typedDatasetEntry } from "~/types/dbColumns.types";
import {
  COMPARISON_MODEL_NAMES,
  calculateFineTuneUsageCost,
  isComparisonModel,
} from "~/utils/baseModels";
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

    const stringsToPrune = await getStringsToPrune(modelId);
    const prunedMessages = pruneInputMessages(datasetEntry.messages, stringsToPrune);

    if (!existingTestEntry) {
      await prisma.fineTuneTestingEntry.create({
        data: {
          modelId,
          datasetEntryId,
        },
      });
    }

    const cacheKey = hashObject({
      modelId,
      messages: prunedMessages as unknown as JsonValue,
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
        : COMPARISON_MODEL_NAMES[modelId as ComparisonModel],
      messages: prunedMessages,
      function_call: datasetEntry.function_call ?? undefined,
      functions: datasetEntry.functions ?? undefined,
    };
    try {
      if (isComparisonModel(modelId)) {
        completion = await getOpenaiCompletion(rawDatasetEntry.dataset.projectId, input);
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

      if (fineTune) {
        const inputTokens = completion.usage?.prompt_tokens ?? 0;
        const outputTokens = completion.usage?.completion_tokens ?? 0;
        await prisma.usageLog.create({
          data: {
            fineTuneId: fineTune.id,
            type: UsageType.TESTING,
            inputTokens,
            outputTokens,
            cost: calculateFineTuneUsageCost({
              inputTokens,
              outputTokens,
              baseModel: fineTune.baseModel,
            }),
          },
        });
      }

      await prisma.fineTuneTestingEntry.update({
        where: { modelId_datasetEntryId: { modelId, datasetEntryId } },
        data: {
          cacheKey,
          output: completionMessage as unknown as Prisma.InputJsonValue,
          prunedInputTokens: completion.usage?.prompt_tokens,
          outputTokens: completion.usage?.completion_tokens,
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
