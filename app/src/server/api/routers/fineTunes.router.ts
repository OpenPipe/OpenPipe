import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { prisma } from "~/server/db";
import { requireCanViewProject, requireCanModifyProject } from "~/utils/accessControl";
import { error, success } from "~/utils/errorHandling/standardResponses";

export const fineTunesRouter = createTRPCRouter({
  list: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        page: z.number(),
        pageSize: z.number(),
      }),
    )
    .query(async ({ input, ctx }) => {
      const { projectId, page, pageSize } = input;

      await requireCanViewProject(projectId, ctx);

      const fineTunes = await prisma.fineTune.findMany({
        where: {
          projectId,
        },
        include: {
          dataset: {
            include: {
              _count: {
                select: {
                  datasetEntries: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: "asc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      });

      const count = await prisma.fineTune.count({
        where: {
          projectId,
        },
      });

      return {
        fineTunes,
        count,
      };
    }),
  create: protectedProcedure
    .input(
      z.object({
        datasetId: z.string(),
        slug: z.string(),
        baseModel: z.string(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const { projectId } = await prisma.dataset.findUniqueOrThrow({
        where: {
          id: input.datasetId,
        },
      });
      await requireCanModifyProject(projectId, ctx);

      const existingFineTune = await prisma.fineTune.findFirst({
        where: {
          slug: input.slug,
        },
      });

      if (existingFineTune) {
        return error("A fine tune with that slug already exists");
      }

      await prisma.fineTune.create({
        data: {
          projectId,
          slug: input.slug,
          baseModel: input.baseModel,
          datasetId: input.datasetId,
        },
      });

      return success();
    }),
});
