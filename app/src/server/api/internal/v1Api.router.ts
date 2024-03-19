import { z } from "zod";
import { TRPCError } from "@trpc/server";

import { prisma } from "~/server/db";
import { createOpenApiRouter, openApiProtectedProc } from "./openApiTrpc";
import { generateBlobDownloadUrl } from "~/utils/azure/server";
import { typedFineTune } from "~/types/dbColumns.types";
import { axolotlConfig } from "~/server/fineTuningProviders/openpipe/axolotlConfig";
import { env } from "~/env.mjs";
import { fireworksConfig } from "~/server/fineTuningProviders/openpipe/fireworksConfig";
import { weightsFormat } from "~/types/shared.types";

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
        fireworksBaseModel: z.string().optional(),
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

      const fireworksBaseModel = fireworksConfig(fineTune)?.baseModel;

      return {
        trainingDataUrl: generateBlobDownloadUrl(fineTune.trainingBlobName),
        huggingFaceModelId: fineTune.huggingFaceModelId,
        trainingConfig: fineTune.trainingConfig,
        fireworksBaseModel,
      };
    }),
  getModelExportInfo: openApiProtectedProc
    .meta({
      openapi: {
        method: "GET",
        path: "/export/get-info",
        description: "Get info necessary to export a model",
        protect: true,
      },
    })
    .input(
      z.object({
        exportId: z.string(),
      }),
    )
    .output(
      z.object({
        baseModel: z.string(),
        fineTuneId: z.string(),
        s3BucketName: z.string(),
        s3Key: z.string(),
        weightsFormat,
      }),
    )
    .mutation(async ({ input }) => {
      const exportRequest = await prisma.exportWeightsRequest.findUniqueOrThrow({
        where: { id: input.exportId },
        include: { fineTune: true },
      });

      if (!env.EXPORTED_MODELS_BUCKET_NAME)
        throw new Error("No bucket configured for model exports");

      await prisma.exportWeightsRequest.update({
        where: { id: input.exportId },
        data: { status: "IN_PROGRESS" },
      });

      return {
        baseModel: exportRequest.fineTune.baseModel,
        fineTuneId: exportRequest.fineTuneId,
        s3BucketName: env.EXPORTED_MODELS_BUCKET_NAME,
        s3Key: exportRequest.s3Key,
        weightsFormat: weightsFormat.parse(exportRequest.weightsFormat),
      };
    }),
  reportModelExportComplete: openApiProtectedProc
    .meta({
      openapi: {
        method: "POST",
        path: "/export/complete",
        description: "Report that a model export has completed",
        protect: true,
      },
    })
    .input(
      z.object({
        exportId: z.string(),
      }),
    )
    .output(z.object({}))
    .mutation(async ({ input }) => {
      await prisma.exportWeightsRequest.findUniqueOrThrow({
        where: { id: input.exportId },
      });

      await prisma.exportWeightsRequest.update({
        where: { id: input.exportId },
        data: { status: "COMPLETE" },
      });

      return {};
    }),
});
