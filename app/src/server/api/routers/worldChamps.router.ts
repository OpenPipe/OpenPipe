import { createTRPCRouter, protectedProcedure, publicProcedure } from "~/server/api/trpc";
import { prisma } from "~/server/db";
import { requireNothing } from "~/utils/accessControl";

export const worldChampsRouter = createTRPCRouter({
  userStatus: publicProcedure.query(async ({ ctx }) => {
    const userId = ctx.session?.user.id;

    if (!userId) {
      return null;
    }

    return await prisma.worldChampEntrant.findUnique({
      where: { userId },
    });
  }),

  apply: protectedProcedure.mutation(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    requireNothing(ctx);

    const existingEntrant = await prisma.worldChampEntrant.findUnique({
      where: { userId },
    });

    if (existingEntrant) {
      return existingEntrant;
    }

    return await prisma.worldChampEntrant.create({
      data: {
        userId,
      },
    });
  }),
});
