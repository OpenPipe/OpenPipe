import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { prisma } from "~/server/db";
import { queueUploadTrainingData } from "~/server/tasks/uploadTrainingData.task";
import { requireCanViewProject, requireCanModifyProject } from "~/utils/accessControl";
import { SUPPORTED_BASE_MODELS } from "~/utils/baseModels";
import { error, success } from "~/utils/errorHandling/standardResponses";

const BaseModelEnum = z.enum(SUPPORTED_BASE_MODELS);

export const fineTunesRouter = createTRPCRouter({
  list: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
      }),
    )
    .query(async ({ input, ctx }) => {
      const { projectId } = input;

      await requireCanViewProject(projectId, ctx);

      const fineTunes = await prisma.fineTune.findMany({
        where: {
          projectId,
        },
        include: {
          _count: {
            select: {
              trainingEntries: true,
              pruningRules: true,
            },
          },
        },
        orderBy: { createdAt: "asc" },
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
  get: protectedProcedure
    .input(
      z.object({
        id: z.string(),
      }),
    )
    .query(async ({ input, ctx }) => {
      const fineTune = await prisma.fineTune.findUnique({
        where: {
          id: input.id,
        },
        include: {
          pruningRules: {
            select: {
              textToMatch: true,
              tokensInText: true,
            },
          },
          _count: {
            select: {
              trainingEntries: true,
            },
          },
        },
      });

      if (!fineTune) throw new TRPCError({ code: "NOT_FOUND", message: "Fine tune not found" });
      await requireCanViewProject(fineTune.projectId, ctx);

      return fineTune;
    }),
  create: protectedProcedure
    .input(
      z.object({
        datasetId: z.string(),
        slug: z.string(),
        baseModel: BaseModelEnum,
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

      const fineTune = await prisma.fineTune.create({
        data: {
          projectId,
          slug: input.slug,
          baseModel: input.baseModel,
          datasetId: input.datasetId,
        },
        include: {
          dataset: {
            include: {
              datasetEntries: {
                select: {
                  id: true,
                  type: true,
                },
                where: {
                  outdated: false,
                  type: "TRAIN",
                },
              },
              pruningRules: {
                select: {
                  id: true,
                  textToMatch: true,
                  tokensInText: true,
                  matches: true,
                },
              },
            },
          },
        },
      });
      if (!fineTune) return error("Error creating fine tune");

      await prisma.fineTuneTrainingEntry.createMany({
        data: fineTune.dataset.datasetEntries.map((datasetEntry) => ({
          fineTuneId: fineTune.id,
          datasetEntryId: datasetEntry.id,
        })),
      });

      // Can't use createMany because of the matches
      await prisma.$transaction(
        fineTune.dataset.pruningRules.map((rule) =>
          prisma.pruningRule.create({
            data: {
              fineTuneId: fineTune.id,
              textToMatch: rule.textToMatch,
              tokensInText: rule.tokensInText,
              matches: {
                create: rule.matches.map((match) => ({
                  datasetEntryId: match.datasetEntryId,
                })),
              },
            },
          }),
        ),
      );

      await queueUploadTrainingData(fineTune.id);

      return success();
    }),
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        slug: z.string(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const fineTune = await prisma.fineTune.findUnique({
        where: {
          id: input.id,
        },
      });

      if (!fineTune) return error("Fine tune not found");
      await requireCanModifyProject(fineTune.projectId, ctx);

      const existingFineTune = await prisma.fineTune.findFirst({
        where: {
          slug: input.slug,
        },
      });

      if (existingFineTune) return error("A fine tune with that slug already exists");

      await prisma.fineTune.update({
        where: {
          id: input.id,
        },
        data: {
          slug: input.slug,
        },
      });

      return success("Fine tune updated");
    }),
  delete: protectedProcedure
    .input(
      z.object({
        id: z.string(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const fineTune = await prisma.fineTune.findUnique({
        where: {
          id: input.id,
        },
      });

      if (!fineTune) return error("Fine tune not found");
      await requireCanModifyProject(fineTune.projectId, ctx);

      await prisma.fineTune.delete({
        where: {
          id: input.id,
        },
      });
      return success("Fine tune deleted");
    }),
});
