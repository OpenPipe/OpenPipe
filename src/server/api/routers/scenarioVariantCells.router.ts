import { z } from "zod";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "~/server/api/trpc";
import { prisma } from "~/server/db";
import { generateNewCell } from "~/server/utils/generateNewCell";
import { queueLLMRetrievalTask } from "~/server/utils/queueLLMRetrievalTask";
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

      return await prisma.scenarioVariantCell.findUnique({
        where: {
          promptVariantId_testScenarioId: {
            promptVariantId: input.variantId,
            testScenarioId: input.scenarioId,
          },
        },
        include: {
          modelOutput: {
            include: {
              outputEvaluation: {
                include: {
                  evaluation: {
                    select: { label: true },
                  },
                },
              },
            },
          },
        },
      });
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
        include: {
          modelOutput: true,
        },
      });

      if (!cell) {
        await generateNewCell(input.variantId, input.scenarioId);
        return true;
      }

      if (cell.modelOutput) {
        // TODO: Maybe keep these around to show previous generations?
        await prisma.modelOutput.delete({
          where: { id: cell.modelOutput.id },
        });
      }

      await prisma.scenarioVariantCell.update({
        where: { id: cell.id },
        data: { retrievalStatus: "PENDING" },
      });

      await queueLLMRetrievalTask(cell.id);
      return true;
    }),
});
