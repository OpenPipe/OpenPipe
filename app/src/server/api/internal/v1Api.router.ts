import { z } from "zod";
import { TRPCError } from "@trpc/server";

import { prisma } from "~/server/db";
import { createOpenApiRouter, openApiProtectedProc } from "./openApiTrpc";
import { generateBlobDownloadUrl } from "~/utils/azure/server";
import { SUPPORTED_BASE_MODELS } from "~/utils/baseModels";

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
        baseModel: z.enum(SUPPORTED_BASE_MODELS),
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
        baseModel: fineTune.baseModel,
      };
    }),
});
