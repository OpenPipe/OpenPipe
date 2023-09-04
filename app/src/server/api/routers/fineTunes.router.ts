import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import { type Prisma } from "@prisma/client";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { prisma } from "~/server/db";
import { requireCanViewProject, requireCanModifyProject } from "~/utils/accessControl";
import { error, success } from "~/utils/errorHandling/standardResponses";
import { shuffle } from "lodash-es";

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
          trainingDataset: {
            include: {
              _count: {
                select: {
                  datasetEntries: true,
                },
              },
            },
          },
          testingDataset: {
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
        datasetEntryIds: z.array(z.string()),
        slug: z.string(),
        baseModel: z.string(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      await requireCanModifyProject(input.projectId, ctx);

      const existingFineTune = await prisma.fineTune.findFirst({
        where: {
          slug: input.slug,
        },
      });

      if (existingFineTune) {
        return error("A fine tune with that slug already exists");
      }

      const splitIndex = Math.floor(input.datasetEntryIds.length * 0.1);

      const shuffledIds = shuffle(input.datasetEntryIds);

      const testingIds = shuffledIds.slice(0, splitIndex);
      const trainingIds = shuffledIds.slice(splitIndex);

      const [existingTestingEntries, existingTrainingEntries] = await prisma.$transaction([
        prisma.datasetEntry.findMany({
          where: {
            id: {
              in: testingIds,
            },
          },
        }),
        prisma.datasetEntry.findMany({
          where: {
            id: {
              in: trainingIds,
            },
          },
        }),
      ]);
      //   type Prisma.DatasetEntryCreateManyDatasetInput = {
      //     id?: string | undefined;
      //     loggedCallId: string;
      //     input: Prisma.NullTypes.JsonNull | Prisma.InputJsonValue;
      //     output?: Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput | undefined;
      //     inputTokens: number;
      //     outputTokens: number;
      //     createdAt?: string | ... 1 more ... | undefined;
      //     updatedAt?: string | ... 1 more ... | undefined;
      // }

      const testingEntriesToCreate: Prisma.DatasetEntryCreateManyDatasetInput[] =
        existingTestingEntries.map((entry) => ({
          loggedCallId: entry.loggedCallId,
          input: entry.input as Prisma.InputJsonValue,
          output: entry.output as Prisma.InputJsonValue,
          inputTokens: entry.inputTokens,
          outputTokens: entry.outputTokens,
        }));

      const trainingEntriesToCreate: Prisma.DatasetEntryCreateManyDatasetInput[] =
        existingTrainingEntries.map((entry) => ({
          loggedCallId: entry.loggedCallId,
          input: entry.input as Prisma.InputJsonValue,
          output: entry.output as Prisma.InputJsonValue,
          inputTokens: entry.inputTokens,
          outputTokens: entry.outputTokens,
        }));

      const testingDatasetId = uuidv4();
      const trainingDatasetId = uuidv4();

      await prisma.$transaction([
        prisma.dataset.create({
          data: {
            id: testingDatasetId,
            name: `${input.slug}-testing`,
            project: {
              connect: {
                id: input.projectId,
              },
            },
            datasetEntries: {
              createMany: {
                data: testingEntriesToCreate,
              },
            },
          },
        }),
        prisma.dataset.create({
          data: {
            id: trainingDatasetId,
            name: `${input.slug}-training`,
            project: {
              connect: {
                id: input.projectId,
              },
            },
            datasetEntries: {
              createMany: {
                data: trainingEntriesToCreate,
              },
            },
          },
        }),
        prisma.fineTune.create({
          data: {
            projectId: input.projectId,
            slug: input.slug,
            baseModel: input.baseModel,
            trainingDatasetId,
            testingDatasetId,
          },
        }),
      ]);

      return success();
    }),
});
