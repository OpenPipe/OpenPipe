import { z } from "zod";
import { TRPCError } from "@trpc/server";

import { prisma } from "~/server/db";
import { createOpenApiRouter, openApiProtectedProc } from "./openApiTrpc";
import { generateBlobDownloadUrl } from "~/utils/azure/server";
import { typedFineTune } from "~/types/dbColumns.types";
import { axolotlConfig } from "~/server/fineTuningProviders/openpipe/axolotlConfig";

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
        trainingConfig: axolotlConfig,
      }),
    )
    .mutation(async ({ input }) => {
      const fineTune = typedFineTune(
        await prisma.fineTune.findUniqueOrThrow({
          where: { id: input.fineTuneId },
        }),
      );

      if (!fineTune.trainingBlobName || !fineTune.huggingFaceModelId || !fineTune.trainingConfig)
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "missing precondition",
        });

      return {
        trainingDataUrl: generateBlobDownloadUrl(fineTune.trainingBlobName),
        huggingFaceModelId: fineTune.huggingFaceModelId,
        trainingConfig: fineTune.trainingConfig,
      };
    }),
});
