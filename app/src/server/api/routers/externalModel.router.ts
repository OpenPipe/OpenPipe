import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { prisma } from "~/server/db";
import { requireNothing, requireCanModifyProject } from "~/utils/accessControl";
import {
  defaultEvaluationModel,
  findPredefinedEvaluationModel,
} from "~/utils/externalModels/evaluationModels";

export const externalModelRouter = createTRPCRouter({
  get: protectedProcedure
    .input(
      z.object({
        id: z.string().optional(),
        projectId: z.string().optional(),
      }),
    )
    .query(async ({ input, ctx }) => {
      requireNothing(ctx);
      const { id, projectId } = input;
      if (projectId) {
        await requireCanModifyProject(projectId, ctx);
      }

      return getEvaluationModel(id, projectId);
    }),
});

export const getEvaluationModel = async (id?: string, projectId?: string) => {
  if (!id) return defaultEvaluationModel;

  let evaluationModel = findPredefinedEvaluationModel(id);

  if (evaluationModel) return evaluationModel;

  evaluationModel = await prisma.externalModel.findUniqueOrThrow({
    where: { id, projectId },
  });
  return evaluationModel;
};
