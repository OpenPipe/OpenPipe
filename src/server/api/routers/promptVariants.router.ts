import { z } from "zod";
import { createTRPCRouter, publicProcedure, protectedProcedure } from "~/server/api/trpc";
import { prisma } from "~/server/db";

export const promptVariantsRouter = createTRPCRouter({
  getAll: publicProcedure.input(z.object({ experimentId: z.string() })).query(async ({ input }) => {
    return await prisma.promptVariant.findMany({
      where: {
        experimentId: input.experimentId,
      },
    });
  }),

  getSecretMessage: protectedProcedure.query(() => {
    return "you can now see this secret message!";
  }),
});
