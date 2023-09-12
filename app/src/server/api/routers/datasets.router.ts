import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { prisma } from "~/server/db";
import { requireCanModifyProject, requireCanViewProject } from "~/utils/accessControl";
import { error, success } from "~/utils/errorHandling/standardResponses";
import { generateServiceClientUrl } from "~/utils/azure/server";
import { queueImportDatasetEntries } from "~/server/tasks/importDatasetEntries.task";

export const datasetsRouter = createTRPCRouter({
  get: protectedProcedure.input(z.object({ id: z.string() })).query(async ({ input, ctx }) => {
    const dataset = await prisma.dataset.findUniqueOrThrow({
      where: { id: input.id },
      include: {
        project: true,
      },
    });

    await requireCanViewProject(dataset.projectId, ctx);

    return dataset;
  }),
  list: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ input, ctx }) => {
      await requireCanViewProject(input.projectId, ctx);

      return await prisma.dataset.findMany({
        where: {
          projectId: input.projectId,
        },
        include: {
          _count: {
            select: {
              datasetEntries: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });
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
        name: z.string(),
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
          name: input.name,
        },
      });

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
      // The user must at least be authenticated to get a SAS token
      await requireCanModifyProject(input.projectId, ctx);
      return generateServiceClientUrl();
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

      await queueImportDatasetEntries(id);
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
