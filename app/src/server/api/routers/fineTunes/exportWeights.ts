import crypto from "crypto";
import { z } from "zod";

import { env } from "~/env.mjs";
import { protectedProcedure } from "~/server/api/trpc";
import { prisma } from "~/server/db";
import { callbackBaseUrl, trainerv1 } from "~/server/modal-rpc/clients";
import { weightsFormat } from "~/types/shared.types";
import { requireIsProjectAdmin } from "~/utils/accessControl";
import { error, success } from "~/utils/errorHandling/standardResponses";

export const getExportWeightsRequests = protectedProcedure
  .input(z.object({ fineTuneId: z.string() }))
  .query(async ({ input, ctx }) => {
    const fineTune = await prisma.fineTune.findUniqueOrThrow({
      where: { id: input.fineTuneId },
    });

    await requireIsProjectAdmin(fineTune.projectId, ctx);

    const requests = await prisma.exportWeightsRequest.findMany({
      where: {
        fineTuneId: input.fineTuneId,
        // only in the last 7 days
        createdAt: { gte: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7) },
      },
      orderBy: { createdAt: "asc" },
    });

    return requests;
  });

export const requestExportWeights = protectedProcedure
  .input(z.object({ fineTuneId: z.string(), weightsFormat }))
  .mutation(async ({ input, ctx }) => {
    const fineTune = await prisma.fineTune.findUniqueOrThrow({
      where: { id: input.fineTuneId },
    });

    await requireIsProjectAdmin(fineTune.projectId, ctx);

    if (!env.EXPORTED_MODELS_BUCKET_NAME) return error("No bucket configured for model exports");

    const existingRequest = await prisma.exportWeightsRequest.findFirst({
      where: {
        fineTuneId: input.fineTuneId,
        weightsFormat: input.weightsFormat,
        userId: ctx.session.user.id,
        // only in the last 7 days
        createdAt: { gte: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7) },
      },
    });

    if (existingRequest) return error("An export request is already in progress");

    const s3Key = `exports/${crypto.randomBytes(48).toString("base64url")}/model.zip`;

    const exportRequest = await prisma.exportWeightsRequest.create({
      data: {
        fineTuneId: input.fineTuneId,
        userId: ctx.session.user.id,
        weightsFormat: input.weightsFormat,
        s3Key,
        publicUrl: `https://${env.EXPORTED_MODELS_BUCKET_NAME}.s3.amazonaws.com/${s3Key}`,
      },
    });

    await trainerv1.default.exportWeights(exportRequest.id, callbackBaseUrl);

    return success();
  });
