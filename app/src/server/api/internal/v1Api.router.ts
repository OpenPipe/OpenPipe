import { z } from "zod";
import { TRPCError } from "@trpc/server";

import { prisma } from "~/server/db";
import { createOpenApiRouter, openApiProtectedProc } from "./openApiTrpc";
import { generateBlobDownloadUrl } from "~/utils/azure/server";
import { supportedModels } from "~/server/fineTuningProviders/openpipe/types";

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
        baseModel: z.string(),
        projectName: z.string(),
        modelSlug: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      const fineTune = await prisma.fineTune.findUnique({
        where: { id: input.fineTuneId },
        include: {
          project: {
            select: { name: true },
          },
        },
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
        baseModel: supportedModels.parse(fineTune.baseModel),
        projectName: fineTune.project.name,
        modelSlug: fineTune.slug,
      };
    }),
});
