import { z } from "zod";
import { createTRPCRouter, publicProcedure, protectedProcedure } from "~/server/api/trpc";
import { prisma } from "~/server/db";

export const experimentsRouter = createTRPCRouter({
  get: publicProcedure.input(z.object({ id: z.string() })).query(async ({ input }) => {
    return await prisma.experiment.findFirst({
      where: {
        id: input.id,
      },
      include: {
        TemplateVariable: {
          orderBy: {
            createdAt: "asc",
          },
          select: {
            id: true,
            label: true,
          },
        },
      },
    });
  }),

  setTemplateVariables: publicProcedure
    .input(
      z.object({
        id: z.string(),
        labels: z.array(z.string()),
      })
    )
    .mutation(async ({ input }) => {
      const existing = await prisma.templateVariable.findMany({
        where: { experimentId: input.id },
      });
      const toDelete = existing.filter((e) => !input.labels.includes(e.label));

      const toCreate = new Set(
        input.labels.filter((l) => !existing.map((e) => e.label).includes(l))
      ).values();

      await prisma.$transaction([
        prisma.templateVariable.deleteMany({
          where: { id: { in: toDelete.map((e) => e.id) } },
        }),
        prisma.templateVariable.createMany({
          data: [...toCreate].map((l) => ({ label: l, experimentId: input.id })),
        }),
      ]);
      return null;
    }),
});
