import { z } from "zod";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "~/server/api/trpc";
import { prisma } from "~/server/db";
import {
  requireCanModifyDataset,
  requireCanModifyOrganization,
  requireCanViewDataset,
  requireCanViewOrganization,
} from "~/utils/accessControl";

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
      include: {
        organization: true,
      },
    });
  }),

  create: protectedProcedure
    .input(z.object({ organizationId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      await requireCanModifyOrganization(input.organizationId, ctx);

      const numDatasets = await prisma.dataset.count({
        where: {
          organizationId: input.organizationId,
        },
      });

      return await prisma.dataset.create({
        data: {
          name: `Dataset ${numDatasets + 1}`,
          organizationId: input.organizationId,
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
