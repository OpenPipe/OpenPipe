import { z } from "zod";
import { createTRPCRouter, publicProcedure, protectedProcedure } from "~/server/api/trpc";
import { prisma } from "~/server/db";

export const templateVarsRouter = createTRPCRouter({
  create: publicProcedure
    .input(z.object({ experimentId: z.string(), label: z.string() }))
    .mutation(async ({ input }) => {
      await prisma.templateVariable.create({
        data: {
          experimentId: input.experimentId,
          label: input.label,
        },
      });
    }),

  delete: publicProcedure.input(z.object({ id: z.string() })).mutation(async ({ input }) => {
    await prisma.templateVariable.delete({ where: { id: input.id } });
  }),

  list: publicProcedure.input(z.object({ experimentId: z.string() })).query(async ({ input }) => {
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
