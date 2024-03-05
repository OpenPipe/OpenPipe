import { UsageType, type ComparisonModel } from "@prisma/client";
import { isNumber } from "lodash-es";
import type {
  ChatCompletion,
  ChatCompletionCreateParamsNonStreaming,
  ChatCompletionMessage,
} from "openai/resources/chat";
import { v4 as uuidv4 } from "uuid";
import { RateLimitError } from "openai";

import { getCompletion } from "~/modelProviders/fine-tuned/getCompletion";
import { kysely, prisma } from "~/server/db";
import { typedFineTune, typedNodeEntry } from "~/types/dbColumns.types";
import { COMPARISON_MODEL_NAMES, isComparisonModel } from "~/utils/comparisonModels";
import { calculateCost } from "../fineTuningProviders/supportedModels";
import {
  calculateFieldComparisonScore,
  saveFieldComparisonScore,
} from "../utils/calculateFieldComparisonScore";
import { getOpenaiCompletion } from "../utils/openai";
import defineTask from "./defineTask";
import { hashAndSaveDatasetEntryOutput } from "../utils/nodes/hashNode";
import { chatCompletionMessage } from "~/types/shared.types";
import { fireworksTestSetLimit } from "~/utils/rateLimit/rateLimits";

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
    const { nodeEntryId, numPreviousTries } = task;

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
    .innerJoin("DataChannel as dc", "dc.id", "ne.dataChannelId")
    .innerJoin("Node as n", "n.id", "dc.destinationId")
    .innerJoin("Dataset as d", "d.nodeId", "n.id")
    .innerJoin("DatasetEntryInput as dei", "dei.hash", "ne.inputHash")
    .innerJoin("DatasetEntryOutput as deo", "deo.hash", "ne.outputHash")
    .select([
      "n.projectId",
      "d.id as datasetId",
      "ne.persistentId",
      "ne.inputHash",
      "dei.tool_choice",
      "dei.tools",
      "dei.messages",
      "dei.response_format",
      "deo.output",
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

  const tNodeEntry = typedNodeEntry(nodeEntry);

  const existingTestEntry = await kysely
    .selectFrom("FineTuneTestingEntry as ftte")
    .where("ftte.modelId", "=", modelId)
    .where("ftte.inputHash", "=", nodeEntry.inputHash)
    .innerJoin("DatasetEntryOutput as deo", "deo.hash", "ftte.outputHash")
    .select(["ftte.outputHash", "ftte.errorMessage", "deo.output"])
    .executeTakeFirst();

  if (existingTestEntry?.outputHash && !existingTestEntry.errorMessage && !skipCache) {
    const existingOutput = chatCompletionMessage.safeParse(existingTestEntry.output);

    if (existingOutput.success) {
      await triggerFieldComparisonEval({
        datasetId: tNodeEntry.datasetId,
        persistentId: tNodeEntry.persistentId,
        modelId,
        nodeEntry: tNodeEntry,
        fineTuneTestingEntryOutput: existingOutput.data,
      });
      return;
    }
  }

  if (!existingTestEntry) {
    await kysely
      .insertInto("FineTuneTestingEntry")
      .values({
        id: uuidv4(),
        projectId: tNodeEntry.projectId,
        modelId,
        fineTuneId: fineTune?.id,
        inputHash: tNodeEntry.inputHash,
        updatedAt: new Date(),
      })
      .onConflict((oc) => oc.columns(["modelId", "inputHash"]).doNothing())
      .execute();
  }

  let completion: ChatCompletion;
  const input: ChatCompletionCreateParamsNonStreaming = {
    model: fineTune
      ? `openpipe:${fineTune.slug}`
      : COMPARISON_MODEL_NAMES[modelId as ComparisonModel].name,
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
      if (
        fineTune.baseModel === "mistralai/Mixtral-8x7B-Instruct-v0.1" &&
        !(await fireworksTestSetLimit())
      ) {
        throw new RateLimitError(
          429,
          { error: "Completion rate limit exceeded" },
          "Completion rate limit exceeded",
          {},
        );
      }
      completion = await getCompletion(fineTune, input);
    } else {
      await prisma.fineTuneTestingEntry.updateMany({
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
          billable: fineTune.provider === "openpipe",
        },
      });
    }

    const outputHash = await hashAndSaveDatasetEntryOutput({
      projectId: tNodeEntry.projectId,
      output: completionMessage,
    });

    await prisma.fineTuneTestingEntry.update({
      where: { inputHash_modelId: { modelId, inputHash: nodeEntry.inputHash } },
      data: {
        outputHash,
        finishReason: choice.finish_reason,
        prunedInputTokens: completion.usage?.prompt_tokens,
        errorMessage: null,
      },
    });

    await triggerFieldComparisonEval({
      datasetId: tNodeEntry.datasetId,
      persistentId: tNodeEntry.persistentId,
      modelId,
      nodeEntry: tNodeEntry,
      fineTuneTestingEntryOutput: completionMessage,
    });
  } catch (e: unknown) {
    if (e instanceof RateLimitError) {
      await prisma.fineTuneTestingEntry.update({
        where: { inputHash_modelId: { modelId, inputHash: nodeEntry.inputHash } },
        data: {
          errorMessage: "Pending",
        },
      });
    } else {
      const typedError = e as { message?: string; status?: number; error?: { message: string } };
      let errorMessage;
      if (typedError.status === 404) {
        errorMessage = "Model training incomplete";
      } else {
        errorMessage =
          typedError.message ?? typedError.error?.message ?? "Error retrieving completion";
      }

      await prisma.fineTuneTestingEntry.update({
        where: { inputHash_modelId: { modelId, inputHash: nodeEntry.inputHash } },
        data: {
          errorMessage,
        },
      });
    }
    throw e;
  }
};

const triggerFieldComparisonEval = async ({
  datasetId,
  persistentId,
  modelId,
  nodeEntry,
  fineTuneTestingEntryOutput,
}: {
  datasetId: string;
  persistentId: string;
  modelId: string;
  nodeEntry: ReturnType<typeof typedNodeEntry> & { inputHash: string };
  fineTuneTestingEntryOutput: ChatCompletionMessage;
}) => {
  const fieldComparisonScore = calculateFieldComparisonScore(nodeEntry, fineTuneTestingEntryOutput);

  if (isNumber(fieldComparisonScore)) {
    await saveFieldComparisonScore({
      datasetId,
      persistentId,
      nodeEntryInputHash: nodeEntry.inputHash,
      score: fieldComparisonScore,
      modelId,
    });
  }
};
