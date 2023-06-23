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
});
