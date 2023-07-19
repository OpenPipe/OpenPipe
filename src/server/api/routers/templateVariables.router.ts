import { z } from "zod";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "~/server/api/trpc";
import { prisma } from "~/server/db";
import { requireCanModifyExperiment, requireCanViewExperiment } from "~/utils/accessControl";

export const templateVarsRouter = createTRPCRouter({
  create: protectedProcedure
    .input(z.object({ experimentId: z.string(), label: z.string() }))
    .mutation(async ({ input, ctx }) => {
      await requireCanModifyExperiment(input.experimentId, ctx);

      await prisma.templateVariable.create({
        data: {
          experimentId: input.experimentId,
          label: input.label,
        },
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const { experimentId } = await prisma.templateVariable.findUniqueOrThrow({
        where: { id: input.id },
      });

      await requireCanModifyExperiment(experimentId, ctx);

      await prisma.templateVariable.delete({ where: { id: input.id } });
    }),

  list: publicProcedure
    .input(z.object({ experimentId: z.string() }))
    .query(async ({ input, ctx }) => {
      await requireCanViewExperiment(input.experimentId, ctx);
      return await prisma.templateVariable.findMany({
        where: {
          experimentId: input.experimentId,
        },
        orderBy: {
          createdAt: "asc",
        },
        select: {
          id: true,
          label: true,
        },
      });
    }),
});
