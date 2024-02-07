import { Prisma, UsageType, type ComparisonModel, type FineTuneTestingEntry } from "@prisma/client";
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

export type GenerateTestSetEntryJob = {
  modelId: string;
  nodeDataId: string;
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
    const { modelId, nodeDataId, numPreviousTries } = task;

    const nodeData = await prisma.nodeData.findFirst({
      where: { id: nodeDataId },
    });

    if (!nodeData) return;

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
        await prisma.fineTuneTestingEntry.updateMany({
          where: { modelId, inputHash: nodeData.inputHash },
          data: {
            output: Prisma.JsonNull,
            outputTokens: null,
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
  nodeDataId,
  skipCache,
}: {
  modelId: string;
  nodeDataId: string;
  skipCache?: boolean;
}) => {
  const nodeData = await kysely
    .selectFrom("NodeData as nd")
    .where("nd.id", "=", nodeDataId)
    .innerJoin("Node as n", "n.id", "nd.nodeId")
    .innerJoin("Dataset as d", "d.nodeId", "n.id")
    .innerJoin("DatasetEntryInput as dei", "dei.hash", "nd.inputHash")
    .select([
      "n.projectId",
      "d.id as datasetId",
      "nd.importId",
      "nd.inputHash",
      "dei.tool_choice",
      "dei.tools",
      "dei.messages",
      "dei.response_format",
    ])
    .executeTakeFirst();

  if (!nodeData) return;

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

  const tNodeData = typedDatasetEntry(nodeData);

  const existingTestEntry = await prisma.fineTuneTestingEntry.findFirst({
    where: { modelId, inputHash: nodeData.inputHash },
  });

  if (existingTestEntry?.output && !existingTestEntry.errorMessage && !skipCache) {
    await triggerFieldComparisonEval(tNodeData, existingTestEntry);
    return;
  }

  if (!existingTestEntry) {
    await prisma.fineTuneTestingEntry.create({
      data: {
        modelId,
        fineTuneId: fineTune?.id,
        inputHash: tNodeData.inputHash,
      },
    });
  }

  let completion: ChatCompletion;
  const input: ChatCompletionCreateParamsNonStreaming = {
    model: fineTune
      ? `openpipe:${fineTune.slug}`
      : COMPARISON_MODEL_NAMES[modelId as ComparisonModel],
    messages: tNodeData.messages,
    tool_choice: tNodeData.tool_choice ?? undefined,
    tools: tNodeData.tools ?? undefined,
    response_format: tNodeData.response_format ?? undefined,
    stream: false,
  };

  try {
    if (isComparisonModel(modelId)) {
      completion = await getOpenaiCompletion(tNodeData.projectId, input);
    } else if (fineTune) {
      completion = await getCompletion(fineTune, input);
    } else {
      await prisma.fineTuneTestingEntry.updateMany({
        where: { modelId, inputHash: tNodeData.inputHash },
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

    await prisma.fineTuneTestingEntry.updateMany({
      where: { modelId, inputHash: nodeData.inputHash },
      data: {
        output: completionMessage as unknown as Prisma.InputJsonValue,
        finishReason: choice.finish_reason,
        prunedInputTokens: completion.usage?.prompt_tokens,
        outputTokens: completion.usage?.completion_tokens,
        errorMessage: null,
      },
    });

    // TODO: retrieve from update call once uniqueness on inputHash is enforced
    const updatedFineTuneTestingEntry = await prisma.fineTuneTestingEntry.findFirstOrThrow({
      where: { modelId, inputHash: nodeData.inputHash },
    });

    await triggerFieldComparisonEval(tNodeData, updatedFineTuneTestingEntry);
  } catch (e: unknown) {
    const typedError = e as { message?: string; error?: { message: string } };
    await prisma.fineTuneTestingEntry.updateMany({
      where: { modelId, inputHash: nodeData.inputHash },
      data: {
        errorMessage:
          typedError.message ?? typedError.error?.message ?? "Error retrieving completion",
      },
    });
    throw e;
  }
};

const triggerFieldComparisonEval = async (
  nodeData: ReturnType<typeof typedDatasetEntry> & {
    datasetId: string;
    importId: string;
  },
  fineTuneTestingEntry: FineTuneTestingEntry,
) => {
  const typedTestingEntry = typedFineTuneTestingEntry(fineTuneTestingEntry);

  if (!typedTestingEntry.output) throw new Error("No completion returned");

  const fieldComparisonScore = calculateFieldComparisonScore(nodeData, typedTestingEntry);

  if (isNumber(fieldComparisonScore)) {
    await saveFieldComparisonScore({
      datasetId: nodeData.datasetId,
      importId: nodeData.importId,
      score: fieldComparisonScore,
      modelId: fineTuneTestingEntry.modelId,
    });
  }
};
