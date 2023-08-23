import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import { type Prisma } from "@prisma/client";

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
        projectId: z.string(),
        selectedLogIds: z.array(z.string()),
        slug: z.string(),
        baseModel: z.string(),
      }),
    )
    .query(async ({ input, ctx }) => {
      await requireCanModifyProject(input.projectId, ctx);

      const existingFineTune = await prisma.fineTune.findFirst({
        where: {
          slug: input.slug,
        },
      });

      if (existingFineTune) {
        return error("A fine tune with that slug already exists");
      }

      const newDatasetId = uuidv4();

      const datasetEntriesToCreate: Prisma.DatasetEntryCreateManyDatasetInput[] =
        input.selectedLogIds.map((loggedCallId) => ({
          loggedCallId,
        }));

      await prisma.$transaction([
        prisma.dataset.create({
          data: {
            id: newDatasetId,
            name: input.slug,
            project: {
              connect: {
                id: input.projectId,
              },
            },
            datasetEntries: {
              createMany: {
                data: datasetEntriesToCreate,
              },
            },
          },
        }),
        prisma.fineTune.create({
          data: {
            projectId: input.projectId,
            slug: input.slug,
            baseModel: input.baseModel,
            datasetId: newDatasetId,
          },
        }),
      ]);

      return success();
    }),
});
