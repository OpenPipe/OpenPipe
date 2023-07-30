import { z } from "zod";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "~/server/api/trpc";
import { prisma } from "~/server/db";
import { requireCanAccessDataFlow } from "~/utils/accessControl";

export const loggedCallRouter = createTRPCRouter({
  list: protectedProcedure
    .input(z.object({ dataFlowId: z.string() }))
    .query(async ({ input, ctx }) => {
      await requireCanAccessDataFlow(input.dataFlowId, ctx);

      return await prisma.loggedCall.findMany({
        where: {
          dataFlowId: input.dataFlowId,
        },
        include: {
            modelResponse: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      });
    }),

  get: publicProcedure.input(z.object({ id: z.string() })).query(async ({ input, ctx }) => {
    const loggedCall = await prisma.loggedCall.findFirst({
      where: {
        id: input.id,
      },
      include: {
        modelResponse: true,
      }
    });

    if (!loggedCall) {
      throw new Error("Logged call not found");
    }

    await requireCanAccessDataFlow(loggedCall?.dataFlowId, ctx);

    return loggedCall;
  }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const loggedCall = await prisma.loggedCall.findFirst({
        where: {
          id: input.id,
        },
      });

      if (!loggedCall) {
        throw new Error("Logged call not found");
      }

      await requireCanAccessDataFlow(loggedCall?.dataFlowId, ctx);

      await prisma.loggedCall.delete({
        where: {
          id: input.id,
        },
      });
    }),
});
