import { Prisma, UsageType, type ComparisonModel, type FineTuneTestingEntry } from "@prisma/client";
import { isNumber } from "lodash-es";
import type { ChatCompletion, ChatCompletionCreateParamsNonStreaming } from "openai/resources/chat";
import type { JsonValue } from "type-fest";

import { getCompletion2 } from "~/modelProviders/fine-tuned/getCompletion-2";
import { prisma } from "~/server/db";
import hashObject from "~/server/utils/hashObject";
import {
  typedDatasetEntry,
  typedFineTune,
  typedFineTuneTestingEntry,
} from "~/types/dbColumns.types";
import { COMPARISON_MODEL_NAMES, isComparisonModel } from "~/utils/comparisonModels";
import { calculateCost } from "../fineTuningProviders/supportedModels";
import {
  calculateFieldComparisonScore,
  saveFieldComparisonScore,
} from "../utils/calculateFieldComparisonScore";
import { getOpenaiCompletion } from "../utils/openai";
import defineTask from "./defineTask";
import { queueHeadToHeadEvalJobsForTestingEntry } from "./evaluateTestSetEntries.task";

export type GenerateTestSetEntryJob = {
  modelId: string;
  datasetEntryId: string;
  numPreviousTries: number;
  skipCache?: boolean;
};

const MAX_TRIES = 25;

const MIN_DELAY = 500; // milliseconds
const MAX_DELAY = 30000; // milliseconds

export function calculateQueryDelay(numPreviousTries: number): number {
  const baseDelay = Math.min(MAX_DELAY, MIN_DELAY * Math.pow(2, numPreviousTries));
  const jitter = Math.random() * baseDelay;
  return baseDelay + jitter;
}

export const generateTestSetEntry = defineTask<GenerateTestSetEntryJob>({
  id: "generateTestSetEntry",
  handler: async (task) => {
    try {
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
        fineTune = typedFineTune(
          await prisma.fineTune.findUniqueOrThrow({
            where: { id: modelId },
          }),
        );
      }

      const datasetEntry = typedDatasetEntry(rawDatasetEntry);

      const existingTestEntry = await prisma.fineTuneTestingEntry.findUnique({
        where: { modelId_datasetEntryId: { modelId, datasetEntryId } },
      });

      if (existingTestEntry?.output && !existingTestEntry.errorMessage && !skipCache) return;

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
          const newTestEntry = await prisma.fineTuneTestingEntry.update({
            where: { modelId_datasetEntryId: { modelId, datasetEntryId } },
            data: {
              output: matchingTestEntry.output,
              outputTokens: matchingTestEntry.outputTokens,
              errorMessage: null,
            },
          });
          try {
            await triggerEvals(datasetEntry, newTestEntry);
          } catch (e) {
            await prisma.fineTuneTestingEntry.update({
              where: { modelId_datasetEntryId: { modelId, datasetEntryId } },
              data: {
                output: Prisma.JsonNull,
                outputTokens: null,
                errorMessage: "Error evaluating model output, will retry",
              },
            });
          }
          return;
        }
      }

      let completion: ChatCompletion;
      const input: ChatCompletionCreateParamsNonStreaming = {
        model: fineTune
          ? `openpipe:${fineTune.slug}`
          : COMPARISON_MODEL_NAMES[modelId as ComparisonModel],
        messages: datasetEntry.messages,
        tool_choice: datasetEntry.tool_choice ?? undefined,
        tools: datasetEntry.tools ?? undefined,
        response_format: datasetEntry.response_format ?? undefined,
        stream: false,
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
        if (!choice) throw new Error("No completion returned");
        const completionMessage = choice.message;

        if (fineTune) {
          const inputTokens = completion.usage?.prompt_tokens ?? 0;
          const outputTokens = completion.usage?.completion_tokens ?? 0;

          await prisma.usageLog.create({
            data: {
              fineTuneId: fineTune.id,
              type: UsageType.TESTING,
              inputTokens,
              outputTokens,
              cost: calculateCost(fineTune, 0, inputTokens, outputTokens),
            },
          });
        }

        const updatedFineTuneTestingEntry = await prisma.fineTuneTestingEntry.update({
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

        await triggerEvals(datasetEntry, updatedFineTuneTestingEntry);
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
    } catch (e) {
      console.error("error in generateTestSetEntry", e);
      const { modelId, datasetEntryId, numPreviousTries } = task;
      if (numPreviousTries < MAX_TRIES) {
        await generateTestSetEntry.enqueue(
          {
            ...task,
            numPreviousTries: numPreviousTries + 1,
          },
          { runAt: new Date(Date.now() + calculateQueryDelay(numPreviousTries)), priority: 3 },
        );
      } else {
        await prisma.fineTuneTestingEntry.update({
          where: { modelId_datasetEntryId: { modelId, datasetEntryId } },
          data: {
            output: Prisma.JsonNull,
            outputTokens: null,
            errorMessage: "Unable to evaluate input",
          },
        });
      }
      return;
    }
  },
  specDefaults: {
    priority: 5,
  },
});

const triggerEvals = async (
  datasetEntry: ReturnType<typeof typedDatasetEntry> & { id: string; datasetId: string },
  fineTuneTestingEntry: FineTuneTestingEntry,
) => {
  const typedTestingEntry = typedFineTuneTestingEntry(fineTuneTestingEntry);

  if (!typedTestingEntry.output) throw new Error("No completion returned");

  const fieldComparisonScore = calculateFieldComparisonScore(datasetEntry, typedTestingEntry);

  if (isNumber(fieldComparisonScore)) {
    await saveFieldComparisonScore(
      datasetEntry.datasetId,
      datasetEntry.id,
      fieldComparisonScore,
      fineTuneTestingEntry.modelId,
    );
  }

  await queueHeadToHeadEvalJobsForTestingEntry(fineTuneTestingEntry, datasetEntry.datasetId);
};
