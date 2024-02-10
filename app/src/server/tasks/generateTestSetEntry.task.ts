import { UsageType, type ComparisonModel, type NewFineTuneTestingEntry } from "@prisma/client";
import { isNumber } from "lodash-es";
import type { ChatCompletion, ChatCompletionCreateParamsNonStreaming } from "openai/resources/chat";

import { getCompletion } from "~/modelProviders/fine-tuned/getCompletion";
import { kysely, prisma } from "~/server/db";
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
import { hashAndSaveDatasetEntryOutput } from "../utils/nodes/hashNode";

export type GenerateTestSetEntryJob = {
  modelId: string;
  nodeEntryId: string;
  numPreviousTries: number;
  skipCache?: boolean;
};

const MAX_TRIES = 25;

const MIN_DELAY = 1000; // 1 second
const DEFAULT_MAX_DELAY = 6 * 60 * 60 * 1000; // 6 hours

export function calculateQueryDelay(
  numPreviousTries: number,
  maxDelay = DEFAULT_MAX_DELAY,
): number {
  const baseDelay = Math.min(maxDelay, MIN_DELAY * Math.pow(1.7, numPreviousTries));
  const jitter = Math.random() * baseDelay;
  return baseDelay + jitter;
}

export const generateTestSetEntry = defineTask<GenerateTestSetEntryJob>({
  id: "generateTestSetEntry",
  handler: async (task) => {
    const { modelId, nodeEntryId, numPreviousTries } = task;

    const nodeEntry = await prisma.nodeEntry.findFirst({
      where: { id: nodeEntryId },
    });

    if (!nodeEntry) return;

    try {
      await generateEntry(task);
    } catch (e) {
      console.error("error in generateTestSetEntry", e);
      if (task.numPreviousTries < MAX_TRIES) {
        await generateTestSetEntry.enqueue(
          {
            ...task,
            numPreviousTries: numPreviousTries + 1,
          },
          { runAt: new Date(Date.now() + calculateQueryDelay(numPreviousTries)), priority: 3 },
        );
      } else {
        await prisma.newFineTuneTestingEntry.updateMany({
          where: { modelId, inputHash: nodeEntry.inputHash },
          data: {
            outputHash: null,
            errorMessage: "Unable to evaluate input",
          },
        });
      }
    }
  },
  specDefaults: {
    priority: 5,
  },
});

export const generateEntry = async ({
  modelId,
  nodeEntryId,
  skipCache,
}: {
  modelId: string;
  nodeEntryId: string;
  skipCache?: boolean;
}) => {
  const nodeEntry = await kysely
    .selectFrom("NodeEntry as ne")
    .where("ne.id", "=", nodeEntryId)
    .innerJoin("Node as n", "n.id", "ne.nodeId")
    .innerJoin("Dataset as d", "d.nodeId", "n.id")
    .innerJoin("DatasetEntryInput as dei", "dei.hash", "ne.inputHash")
    .select([
      "n.projectId",
      "d.id as datasetId",
      "ne.persistentId",
      "ne.inputHash",
      "dei.tool_choice",
      "dei.tools",
      "dei.messages",
      "dei.response_format",
    ])
    .executeTakeFirst();

  if (!nodeEntry) return;

  let fineTune;
  if (!isComparisonModel(modelId)) {
    fineTune = await prisma.fineTune
      .findUnique({
        where: { id: modelId },
      })
      .then((ft) => ft && typedFineTune(ft));
  }

  // If the fine-tune was deleted then we don't need to generate a test set
  // entry
  if (!fineTune && !isComparisonModel(modelId)) return;

  const tNodeEntry = typedDatasetEntry(nodeEntry);

  const existingTestEntry = await prisma.newFineTuneTestingEntry.findUnique({
    where: { inputHash_modelId: { modelId, inputHash: nodeEntry.inputHash } },
  });

  if (existingTestEntry?.outputHash && !existingTestEntry.errorMessage && !skipCache) {
    await triggerFieldComparisonEval(tNodeEntry, existingTestEntry);
    return;
  }

  if (!existingTestEntry) {
    await prisma.newFineTuneTestingEntry.create({
      data: {
        modelId,
        fineTuneId: fineTune?.id,
        inputHash: tNodeEntry.inputHash,
      },
    });
  }

  let completion: ChatCompletion;
  const input: ChatCompletionCreateParamsNonStreaming = {
    model: fineTune
      ? `openpipe:${fineTune.slug}`
      : COMPARISON_MODEL_NAMES[modelId as ComparisonModel],
    messages: tNodeEntry.messages,
    tool_choice: tNodeEntry.tool_choice ?? undefined,
    tools: tNodeEntry.tools ?? undefined,
    response_format: tNodeEntry.response_format ?? undefined,
    stream: false,
  };

  try {
    if (isComparisonModel(modelId)) {
      completion = await getOpenaiCompletion(tNodeEntry.projectId, input);
    } else if (fineTune) {
      completion = await getCompletion(fineTune, input);
    } else {
      await prisma.newFineTuneTestingEntry.updateMany({
        where: { modelId, inputHash: tNodeEntry.inputHash },
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
          projectId: fineTune.projectId,
          baseModel: fineTune.baseModel,
          type: UsageType.TESTING,
          inputTokens,
          outputTokens,
          ...calculateCost(fineTune, 0, inputTokens, outputTokens),
        },
      });
    }

    const outputHash = await hashAndSaveDatasetEntryOutput({
      projectId: tNodeEntry.projectId,
      output: completionMessage,
    });

    const updatedFineTuneTestingEntry = await prisma.newFineTuneTestingEntry.update({
      where: { inputHash_modelId: { modelId, inputHash: nodeEntry.inputHash } },
      data: {
        outputHash,
        finishReason: choice.finish_reason,
        prunedInputTokens: completion.usage?.prompt_tokens,
        errorMessage: null,
      },
    });

    await triggerFieldComparisonEval(tNodeEntry, updatedFineTuneTestingEntry);
  } catch (e: unknown) {
    const typedError = e as { message?: string; error?: { message: string } };
    await prisma.newFineTuneTestingEntry.updateMany({
      where: { modelId, inputHash: nodeEntry.inputHash },
      data: {
        errorMessage:
          typedError.message ?? typedError.error?.message ?? "Error retrieving completion",
      },
    });
    throw e;
  }
};

const triggerFieldComparisonEval = async (
  nodeEntry: ReturnType<typeof typedDatasetEntry> & {
    datasetId: string;
    persistentId: string;
  },
  fineTuneTestingEntry: NewFineTuneTestingEntry,
) => {
  const typedTestingEntry = typedFineTuneTestingEntry(fineTuneTestingEntry);

  if (!typedTestingEntry.output) throw new Error("No completion returned");

  const fieldComparisonScore = calculateFieldComparisonScore(nodeEntry, typedTestingEntry);

  if (isNumber(fieldComparisonScore)) {
    await saveFieldComparisonScore({
      datasetId: nodeEntry.datasetId,
      persistentId: nodeEntry.persistentId,
      score: fieldComparisonScore,
      modelId: fineTuneTestingEntry.modelId,
    });
  }
};
