import { z } from "zod";
import { sql } from "kysely";
import type { ComparisonModel } from "@prisma/client";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { kysely, prisma } from "~/server/db";
import { requireCanModifyProject, requireCanViewProject } from "~/utils/accessControl";
import { error, success } from "~/utils/errorHandling/standardResponses";
import { generateBlobUploadUrl } from "~/utils/azure/server";
import { importDatasetEntries } from "~/server/tasks/importDatasetEntries.task";
import { env } from "~/env.mjs";
import { startDatasetTestJobs } from "~/server/utils/startTestJobs";
import { comparisonModels } from "~/utils/comparisonModels";

export const datasetsRouter = createTRPCRouter({
  get: protectedProcedure.input(z.object({ id: z.string() })).query(async ({ input, ctx }) => {
    const [dataset, numTestDatasetEntries] = await prisma.$transaction([
      prisma.dataset.findUniqueOrThrow({
        where: { id: input.id },
        include: {
          project: true,
          fineTunes: {
            where: {
              status: "DEPLOYED",
            },
            orderBy: {
              createdAt: "desc",
            },
          },
          datasetEvals: {
            orderBy: {
              createdAt: "desc",
            },
          },
        },
      }),
      prisma.datasetEntry.count({
        where: {
          datasetId: input.id,
          outdated: false,
          split: "TEST",
        },
      }),
    ]);

    await requireCanViewProject(dataset.projectId, ctx);

    const { fineTunes, ...rest } = dataset;
    return { deployedFineTunes: fineTunes, numTestDatasetEntries, ...rest };
  }),
  list: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ input, ctx }) => {
      const { projectId } = input;
      await requireCanViewProject(projectId, ctx);

      const datasets = await kysely
        .selectFrom("Dataset as d")
        .where("projectId", "=", projectId)
        .selectAll()
        .select(() => [
          sql<number>`(select count(*) from "DatasetEntry" where "datasetId" = d.id and not outdated)::int`.as(
            "datasetEntryCount",
          ),
          sql<number>`(select count(*) from "FineTune" where "datasetId" = d.id)::int`.as(
            "fineTuneCount",
          ),
        ])
        .orderBy("d.createdAt", "desc")
        .execute();

      return datasets;
    }),

  create: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        name: z.string(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      await requireCanModifyProject(input.projectId, ctx);

      const dataset = await prisma.dataset.create({
        data: {
          projectId: input.projectId,
          name: input.name,
        },
      });

      return success(dataset.id);
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        updates: z.object({
          name: z.string().optional(),
          enabledComparisonModels: z
            .array(z.enum(comparisonModels as [ComparisonModel, ...ComparisonModel[]]))
            .optional(),
        }),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const { projectId } = await prisma.dataset.findUniqueOrThrow({
        where: { id: input.id },
      });
      await requireCanModifyProject(projectId, ctx);

      await prisma.dataset.update({
        where: { id: input.id },
        data: {
          name: input.updates.name,
          enabledComparisonModels: input.updates.enabledComparisonModels,
        },
      });

      if (input.updates.enabledComparisonModels) {
        await startDatasetTestJobs(input.id);
      }

      return success("Dataset updated");
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const { projectId } = await prisma.dataset.findUniqueOrThrow({
        where: { id: input.id },
      });
      await requireCanModifyProject(projectId, ctx);

      await prisma.dataset.delete({
        where: { id: input.id },
      });

      return success("Dataset deleted");
    }),
  getServiceClientUrl: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ input, ctx }) => {
      await requireCanModifyProject(input.projectId, ctx);
      const serviceClientUrl = generateBlobUploadUrl();
      return {
        serviceClientUrl,
        containerName: env.AZURE_STORAGE_CONTAINER_NAME,
      };
    }),
  triggerFileDownload: protectedProcedure
    .input(
      z.object({
        datasetId: z.string(),
        blobName: z.string(),
        fileName: z.string(),
        fileSize: z.number(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const { projectId } = await prisma.dataset.findUniqueOrThrow({
        where: { id: input.datasetId },
      });
      await requireCanViewProject(projectId, ctx);

      const { id } = await prisma.datasetFileUpload.create({
        data: {
          datasetId: input.datasetId,
          blobName: input.blobName,
          status: "PENDING",
          fileName: input.fileName,
          fileSize: input.fileSize,
          uploadedAt: new Date(),
        },
      });

      await importDatasetEntries.enqueue({
        datasetFileUploadId: id,
        authoringUserId: ctx.session.user.id,
      });
    }),
  listFileUploads: protectedProcedure
    .input(z.object({ datasetId: z.string() }))
    .query(async ({ input, ctx }) => {
      const { projectId } = await prisma.dataset.findUniqueOrThrow({
        where: { id: input.datasetId },
      });
      await requireCanViewProject(projectId, ctx);

      return await prisma.datasetFileUpload.findMany({
        where: {
          datasetId: input.datasetId,
          visible: true,
        },
        orderBy: { createdAt: "desc" },
      });
    }),
  hideFileUploads: protectedProcedure
    .input(z.object({ fileUploadIds: z.string().array() }))
    .mutation(async ({ input, ctx }) => {
      if (!input.fileUploadIds.length) return error("No file upload ids provided");

      const {
        dataset: { projectId, id: datasetId },
      } = await prisma.datasetFileUpload.findUniqueOrThrow({
        where: { id: input.fileUploadIds[0] },
        select: {
          dataset: {
            select: {
              id: true,
              projectId: true,
            },
          },
        },
      });
      await requireCanModifyProject(projectId, ctx);

      await prisma.datasetFileUpload.updateMany({
        where: {
          id: {
            in: input.fileUploadIds,
          },
          datasetId,
        },
        data: {
          visible: false,
        },
      });
    }),
});
