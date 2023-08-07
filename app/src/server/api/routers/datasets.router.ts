import { z } from "zod";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "~/server/api/trpc";
import { prisma } from "~/server/db";
import {
  requireCanModifyDataset,
  requireCanViewDataset,
  requireCanViewOrganization,
  requireNothing,
} from "~/utils/accessControl";
import userOrg from "~/server/utils/userOrg";

export const datasetsRouter = createTRPCRouter({
  list: protectedProcedure
    .input(z.object({ organizationId: z.string() }))
    .query(async ({ input, ctx }) => {
      await requireCanViewOrganization(input.organizationId, ctx);

      const datasets = await prisma.dataset.findMany({
        where: {
          organizationId: input.organizationId,
        },
        orderBy: {
          createdAt: "desc",
        },
        include: {
          _count: {
            select: { datasetEntries: true },
          },
        },
      });

      return datasets;
    }),

  get: publicProcedure.input(z.object({ id: z.string() })).query(async ({ input, ctx }) => {
    await requireCanViewDataset(input.id, ctx);
    return await prisma.dataset.findFirstOrThrow({
      where: { id: input.id },
    });
  }),

  create: protectedProcedure.input(z.object({})).mutation(async ({ ctx }) => {
    // Anyone can create an experiment
    requireNothing(ctx);

    const numDatasets = await prisma.dataset.count({
      where: {
        organization: {
          organizationUsers: {
            some: { userId: ctx.session.user.id },
          },
        },
      },
    });

    return await prisma.dataset.create({
      data: {
        name: `Dataset ${numDatasets + 1}`,
        organizationId: (await userOrg(ctx.session.user.id)).id,
      },
    });
  }),

  update: protectedProcedure
    .input(z.object({ id: z.string(), updates: z.object({ name: z.string() }) }))
    .mutation(async ({ input, ctx }) => {
      await requireCanModifyDataset(input.id, ctx);
      return await prisma.dataset.update({
        where: {
          id: input.id,
        },
        data: {
          name: input.updates.name,
        },
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      await requireCanModifyDataset(input.id, ctx);

      await prisma.dataset.delete({
        where: {
          id: input.id,
        },
      });
    }),
});
