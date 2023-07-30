import { z } from "zod";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "~/server/api/trpc";
import { prisma } from "~/server/db";
import {
  requireCanAccessDataFlow,
  requireNothing,
} from "~/utils/accessControl";
import userOrg from "~/server/utils/userOrg";

export const dataFlowRouter = createTRPCRouter({
  list: protectedProcedure.query(async ({ ctx }) => {
    // Anyone can list data flows
    requireNothing(ctx);

    const dataFlows = await prisma.dataFlow.findMany({
      where: {
        organization: {
          organizationUsers: {
            some: { userId: ctx.session.user.id },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // TODO: look for cleaner way to do this. Maybe aggregate?
    const dataFlowsWithCounts = await Promise.all(
      dataFlows.map(async (dataFlow) => {
        const loggedCallCount = await prisma.loggedCall.count({
          where: {
            dataFlowId: dataFlow.id,
          },
        });

        return {
          ...dataFlow,
          loggedCallCount,
        };
      }),
    );

    return dataFlowsWithCounts;
  }),

  get: publicProcedure.input(z.object({ id: z.string() })).query(async ({ input, ctx }) => {
    await requireCanAccessDataFlow(input.id, ctx);

    return await prisma.dataFlow.findFirstOrThrow({
      where: { id: input.id },
    });
  }),

  create: protectedProcedure.input(z.object({})).mutation(async ({ ctx }) => {
    // Anyone can create a data flow
    requireNothing(ctx);

    return await prisma.dataFlow.create({
      data: {
        label: `Untitled Data Flow`,
        organizationId: (await userOrg(ctx.session.user.id)).id,
      },
    });
  }),

  update: protectedProcedure
    .input(z.object({ id: z.string(), updates: z.object({ label: z.string() }) }))
    .mutation(async ({ input, ctx }) => {
      await requireCanAccessDataFlow(input.id, ctx);
      return await prisma.dataFlow.update({
        where: {
          id: input.id,
        },
        data: {
          label: input.updates.label,
        },
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      await requireCanAccessDataFlow(input.id, ctx);

      await prisma.dataFlow.delete({
        where: {
          id: input.id,
        },
      });
    }),
});
