import { UsageType, type ComparisonModel, type Prisma } from "@prisma/client";
import { type JsonValue } from "type-fest";
import { type ChatCompletionCreateParams, type ChatCompletion } from "openai/resources/chat";
import { isNumber } from "lodash-es";

import { getCompletion2 } from "~/modelProviders/fine-tuned/getCompletion-2";
import { prisma } from "~/server/db";
import hashObject from "~/server/utils/hashObject";
import { typedDatasetEntry } from "~/types/dbColumns.types";
import {
  COMPARISON_MODEL_NAMES,
  calculateFineTuneUsageCost,
  isComparisonModel,
} from "~/utils/baseModels";
import {
  saveFieldComparisonScore,
  calculateFieldComparisonScore,
} from "../utils/calculateFieldComparisonScore";
import { getOpenaiCompletion } from "../utils/openai";
import defineTask from "./defineTask";
import { queueEvalJobsForTestingEntry } from "./evaluateTestSetEntries.task";

export type GenerateTestSetEntryJob = {
  modelId: string;
  datasetEntryId: string;
  skipCache?: boolean;
};

export const generateTestSetEntry = defineTask<GenerateTestSetEntryJob>({
  id: "generateTestSetEntry",
  handler: async (task) => {
    const { modelId, datasetEntryId } = task;

    // TODO: fix evals with caching
    const skipCache = true;

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

    if (!existingTestEntry) {
      await prisma.fineTuneTestingEntry.create({
        data: {
          modelId,
          fineTuneId: fineTune?.id,
          datasetEntryId,
        },
      });
    }

    const cacheKey = hashObject({
      modelId,
      messages: datasetEntry.messages,
      tool_choice: datasetEntry.tool_choice,
      tools: datasetEntry.tools,
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

    let completion: ChatCompletion;
    const input: ChatCompletionCreateParams = {
      model: fineTune
        ? `openpipe:${fineTune.slug}`
        : COMPARISON_MODEL_NAMES[modelId as ComparisonModel],
      messages: datasetEntry.messages,
      tool_choice: datasetEntry.tool_choice ?? undefined,
      tools: datasetEntry.tools ?? undefined,
      response_format: datasetEntry.response_format ?? undefined,
    };

    try {
      if (isComparisonModel(modelId)) {
        completion = await getOpenaiCompletion(rawDatasetEntry.dataset.projectId, input);
      } else if (fineTune) {
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

      const choice = completion.choices[0];
      const completionMessage = completion.choices[0]?.message;
      if (!choice) throw new Error("No completion returned");

      const fieldComparisonScore = calculateFieldComparisonScore(datasetEntry, choice.message);

      if (isNumber(fieldComparisonScore)) {
        await saveFieldComparisonScore(
          datasetEntry.datasetId,
          datasetEntry.id,
          fieldComparisonScore,
          modelId,
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

      const updatedEntry = await prisma.fineTuneTestingEntry.update({
        where: { modelId_datasetEntryId: { modelId, datasetEntryId } },
        data: {
          cacheKey,
          output: completionMessage as unknown as Prisma.InputJsonValue,
          finishReason: choice.finish_reason,
          prunedInputTokens: completion.usage?.prompt_tokens,
          outputTokens: completion.usage?.completion_tokens,
          errorMessage: null,
        },
      });

      await queueEvalJobsForTestingEntry(updatedEntry, datasetEntry.datasetId);
    } catch (e: unknown) {
      const typedError = e as { message?: string; error?: { message: string } };
      await prisma.fineTuneTestingEntry.update({
        where: { modelId_datasetEntryId: { modelId, datasetEntryId } },
        data: {
          errorMessage:
            typedError.message ?? typedError.error?.message ?? "Error retrieving completion",
        },
      });
      throw e;
    }
  },
  specDefaults: {
    priority: 5,
  },
});
