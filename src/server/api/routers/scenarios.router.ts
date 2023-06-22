import { z } from "zod";
import { createTRPCRouter, publicProcedure, protectedProcedure } from "~/server/api/trpc";
import { prisma } from "~/server/db";

export const scenariosRouter = createTRPCRouter({
  list: publicProcedure.input(z.object({ experimentId: z.string() })).query(async ({ input }) => {
    return await prisma.testScenario.findMany({
      where: {
        experimentId: input.experimentId,
      },
    });
  }),
});
