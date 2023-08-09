import { z } from "zod";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "~/server/api/trpc";
import { prisma } from "~/server/db";
import {
  requireCanModifyDataset,
  requireCanModifyProject,
  requireCanViewDataset,
  requireCanViewProject,
} from "~/utils/accessControl";

export const datasetsRouter = createTRPCRouter({
  list: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ input, ctx }) => {
      await requireCanViewProject(input.projectId, ctx);

      const datasets = await prisma.dataset.findMany({
        where: {
          projectId: input.projectId,
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
        project: true,
      },
    });
  }),

  create: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      await requireCanModifyProject(input.projectId, ctx);

      const numDatasets = await prisma.dataset.count({
        where: {
          projectId: input.projectId,
        },
      });

      return await prisma.dataset.create({
        data: {
          name: `Dataset ${numDatasets + 1}`,
          projectId: input.projectId,
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
