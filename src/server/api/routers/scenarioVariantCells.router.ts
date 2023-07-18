import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { prisma } from "~/server/db";
import { generateNewCell } from "~/server/utils/generateNewCell";
import { queueLLMRetrievalTask } from "~/server/utils/queueLLMRetrievalTask";

export const scenarioVariantCellsRouter = createTRPCRouter({
  get: publicProcedure
    .input(
      z.object({
        scenarioId: z.string(),
        variantId: z.string(),
      }),
    )
    .query(async ({ input }) => {
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
  forceRefetch: publicProcedure
    .input(
      z.object({
        scenarioId: z.string(),
        variantId: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
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
