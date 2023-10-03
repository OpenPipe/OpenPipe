import { z } from "zod";
import { TRPCError } from "@trpc/server";

import { prisma } from "~/server/db";
import { createOpenApiRouter, openApiProtectedProc } from "./openApiTrpc";
import { generateBlobDownloadUrl } from "~/utils/azure/server";
import { SUPPORTED_BASE_MODELS } from "~/utils/baseModels";
import { queueGetTestResult } from "~/server/tasks/getTestResult.task";
import { pruneInputMessages } from "~/modelProviders/fine-tuned/getCompletion";
import { countLlamaChatTokens } from "~/utils/countTokens";
import { ChatCompletionMessage } from "openai/resources/chat";

const BaseModelEnum = z.enum(SUPPORTED_BASE_MODELS);

export const v1ApiRouter = createOpenApiRouter({
  getTrainingInfo: openApiProtectedProc
    .meta({
      openapi: {
        method: "GET",
        path: "/training-info",
        description: "Get info necessary to train a model",
        protect: true,
      },
    })
    .input(
      z.object({
        fineTuneId: z.string(),
      }),
    )
    .output(
      z.object({
        trainingDataUrl: z.string(),
        huggingFaceModelId: z.string(),
        baseModel: BaseModelEnum,
      }),
    )
    .mutation(async ({ input }) => {
      const fineTune = await prisma.fineTune.findUnique({
        where: { id: input.fineTuneId },
      });

      if (!fineTune)
        throw new TRPCError({ code: "NOT_FOUND", message: "Unable to find matching FineTune" });

      if (!fineTune.trainingBlobName || !fineTune.baseModel || !fineTune.huggingFaceModelId)
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "missing precondition",
        });

      return {
        trainingDataUrl: generateBlobDownloadUrl(fineTune.trainingBlobName),
        huggingFaceModelId: fineTune.huggingFaceModelId,
        baseModel: fineTune.baseModel as typeof BaseModelEnum._type,
      };
    }),
  recordStatusUpdate: openApiProtectedProc
    .meta({
      openapi: {
        method: "POST",
        path: "/status-update",
        description: "Record a status update for a model",
        protect: true,
      },
    })
    .input(
      z.object({
        fineTuneId: z.string(),
        status: z.enum([
          "UPLOADING_DATASET",
          "PENDING",
          "TRAINING",
          "AWAITING_DEPLOYMENT",
          "DEPLOYING",
          "DEPLOYED",
          "ERROR",
        ]),
      }),
    )
    .output(z.object({ status: z.union([z.literal("ok"), z.literal("error")]) }))
    .query(async ({ input }) => {
      const fineTune = await prisma.fineTune.findUnique({
        where: { id: input.fineTuneId },
      });

      if (!fineTune)
        throw new TRPCError({ code: "NOT_FOUND", message: "Unable to find matching FineTune" });

      await prisma.fineTune.update({
        where: { id: input.fineTuneId },
        data: { status: input.status },
      });

      if (input.status === "DEPLOYED") {
        const pruningRules = await prisma.pruningRule.findMany({
          where: { fineTuneId: fineTune.id },
          select: { textToMatch: true },
        });
        const stringsToPrune = pruningRules.map((rule) => rule.textToMatch);
        const datasetEntries = await prisma.datasetEntry.findMany({
          where: { datasetId: fineTune.datasetId, outdated: false, type: "TEST" },
          select: { id: true, input: true },
          orderBy: { sortKey: "desc" },
        });
        // create fineTuneTestEntry for each dataset entry
        await prisma.fineTuneTestingEntry.createMany({
          data: datasetEntries.map((entry) => {
            const prunedInput = pruneInputMessages(
              entry.input as unknown as ChatCompletionMessage[],
              stringsToPrune,
            );
            const prunedInputTokens = countLlamaChatTokens(prunedInput);
            return {
              fineTuneId: fineTune.id,
              datasetEntryId: entry.id,
              prunedInputTokens,
              prunedInput,
            };
          }),
          skipDuplicates: true,
        });
        for (const entry of datasetEntries) {
          await queueGetTestResult(fineTune.id, entry.id);
        }
      }

      return { status: "ok" };
    }),
});
