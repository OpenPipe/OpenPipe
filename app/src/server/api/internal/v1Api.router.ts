import { z } from "zod";
import { prisma } from "~/server/db";
import { createOpenApiRouter, openApiPublicProc } from "./openApiTrpc";
import { TRPCError } from "@trpc/server";
import { generateBlobDownloadUrl } from "~/utils/azure/server";
import { SUPPORTED_BASE_MODELS } from "~/utils/baseModels";

const BaseModelEnum = z.enum(SUPPORTED_BASE_MODELS);

export const v1ApiRouter = createOpenApiRouter({
  getTrainingInfo: openApiPublicProc
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
        trainingBlobDownloadUrl: z.string(),
        baseModel: BaseModelEnum,
      }),
    )
    .mutation(async ({ input }) => {
      const fineTune = await prisma.fineTune.findUnique({
        where: { id: input.fineTuneId },
        select: {
          trainingBlobName: true,
          baseModel: true,
        },
      });

      if (!fineTune)
        throw new TRPCError({ code: "NOT_FOUND", message: "Unable to find matching FineTune" });

      if (!fineTune.trainingBlobName || !fineTune.baseModel)
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "trainingBlobName or baseModel not set",
        });

      return {
        trainingBlobDownloadUrl: generateBlobDownloadUrl(fineTune.trainingBlobName),
        baseModel: fineTune.baseModel as typeof BaseModelEnum._type,
      };
    }),
});
