import { z } from "zod";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "~/server/api/trpc";
import { prisma } from "~/server/db";
import { queueQueryModel } from "~/server/tasks/queryModel.task";
import { generateNewCell } from "~/server/utils/generateNewCell";
import { requireCanModifyExperiment, requireCanViewExperiment } from "~/utils/accessControl";

export const scenarioVariantCellsRouter = createTRPCRouter({
  get: publicProcedure
    .input(
      z.object({
        scenarioId: z.string(),
        variantId: z.string(),
      }),
    )
    .query(async ({ input, ctx }) => {
      const { experimentId } = await prisma.testScenario.findUniqueOrThrow({
        where: { id: input.scenarioId },
      });
      await requireCanViewExperiment(experimentId, ctx);

      const [cell, numTotalEvals] = await prisma.$transaction([
        prisma.scenarioVariantCell.findUnique({
          where: {
            promptVariantId_testScenarioId: {
              promptVariantId: input.variantId,
              testScenarioId: input.scenarioId,
            },
          },
          include: {
            modelResponses: {
              where: {
                outdated: false,
              },
              include: {
                outputEvaluations: {
                  include: {
                    evaluation: {
                      select: { label: true },
                    },
                  },
                },
              },
            },
          },
        }),
        prisma.evaluation.count({
          where: { experimentId },
        }),
      ]);

      if (!cell) return null;

      const lastResponse = cell.modelResponses?.[cell.modelResponses?.length - 1];
      const evalsComplete = lastResponse?.outputEvaluations?.length === numTotalEvals;

      return {
        ...cell,
        evalsComplete,
      };
    }),
  forceRefetch: protectedProcedure
    .input(
      z.object({
        scenarioId: z.string(),
        variantId: z.string(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const { experimentId } = await prisma.testScenario.findUniqueOrThrow({
        where: { id: input.scenarioId },
      });

      await requireCanModifyExperiment(experimentId, ctx);

      const cell = await prisma.scenarioVariantCell.findUnique({
        where: {
          promptVariantId_testScenarioId: {
            promptVariantId: input.variantId,
            testScenarioId: input.scenarioId,
          },
        },
      });

      if (!cell) {
        await generateNewCell(input.variantId, input.scenarioId, { stream: true });
        return;
      }

      await prisma.modelResponse.updateMany({
        where: { scenarioVariantCellId: cell.id },
        data: {
          outdated: true,
        },
      });

      await queueQueryModel(cell.id, true);
    }),
});
