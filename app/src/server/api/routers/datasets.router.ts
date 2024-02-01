import { z } from "zod";
import { sql } from "kysely";
import type { ComparisonModel } from "@prisma/client";
import { v4 as uuidv4 } from "uuid";
import { TRPCError } from "@trpc/server";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { kysely, prisma } from "~/server/db";
import { requireCanModifyProject, requireCanViewProject } from "~/utils/accessControl";
import { error, success } from "~/utils/errorHandling/standardResponses";
import { generateBlobUploadUrl } from "~/utils/azure/server";
import { env } from "~/env.mjs";
import { startDatasetTestJobs } from "~/server/utils/startTestJobs";
import { comparisonModels } from "~/utils/comparisonModels";
import { filtersSchema } from "~/types/shared.types";
import { constructNodeDataFiltersQuery } from "~/server/utils/constructNodeDataFiltersQuery";
import { ArchiveOutputs, DEFAULT_MAX_OUTPUT_SIZE } from "~/server/utils/nodes/node.types";
import { processNode } from "~/server/tasks/nodes/processNode.task";
import { checkNodeInput } from "~/server/utils/nodes/checkNodeInput";

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
  getTrainingCosts: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        filters: filtersSchema,
        selectedPruningRuleIds: z.array(z.string()),
      }),
    )
    .query(async ({ input, ctx }) => {
      const { id, filters, selectedPruningRuleIds } = input;

      const { projectId, nodeId } = await prisma.dataset.findUniqueOrThrow({
        where: { id },
      });

      await requireCanViewProject(projectId, ctx);

      if (!nodeId) throw new TRPCError({ message: "Dataset node not found", code: "NOT_FOUND" });

      const trainingEntryStats = await constructNodeDataFiltersQuery({
        filters,
        datasetNodeId: nodeId,
      })
        .where("nd.split", "=", "TRAIN")
        .select((eb) => [
          sql<number>`count(*)::int`.as("numEntries"),
          sql<number>`sum(dei."inputTokens")::int`.as("totalInputTokens"),
          sql<number>`sum(deo."outputTokens")::int`.as("totalOutputTokens"),
          eb
            .selectFrom("PruningRuleMatch as prm")
            .whereRef("prm.inputHash", "=", "nd.inputHash")
            .where("prm.pruningRuleId", "in", selectedPruningRuleIds)
            .leftJoin("PruningRule as pr", "prm.pruningRuleId", "pr.id")
            .select(() => [sql<number>`sum(pr."tokensInText")::int`.as("totalMatchTokens")])
            .as("totalMatchTokens"),
        ])
        .executeTakeFirst();

      if (!trainingEntryStats) return error("No training data found");

      const trainingTokens =
        trainingEntryStats.totalInputTokens +
        trainingEntryStats.totalOutputTokens -
        (trainingEntryStats.totalMatchTokens ?? 0);

      const totalTestingCount = await prisma.nodeData.count({
        where: {
          nodeId,
          split: "TEST",
          status: "PROCESSED",
        },
      });

      return {
        matchingTrainingCount: trainingEntryStats.numEntries,
        totalTestingCount,
        trainingTokens,
      };
    }),
  list: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ input, ctx }) => {
      const { projectId } = input;
      await requireCanViewProject(projectId, ctx);

      const datasets = await kysely
        .selectFrom("Dataset as d")
        .where("projectId", "=", projectId)
        .where("nodeId", "is not", null)
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
      await requireCanModifyProject(projectId, ctx);

      const numArchives = await prisma.node.count({
        where: {
          projectId,
          type: "Archive",
        },
      });

      const archiveId = uuidv4();

      const entriesOutputId = uuidv4();

      const datasetNode = await kysely
        .selectFrom("Dataset as d")
        .where("d.id", "=", input.datasetId)
        .innerJoin("Node as n", "n.id", "d.nodeId")
        .selectAll("n")
        .executeTakeFirst();

      if (!datasetNode) return error("Dataset not found");

      await prisma.$transaction([
        prisma.node.create({
          data: checkNodeInput({
            id: archiveId,
            projectId,
            type: "Archive",
            name: `Archive ${numArchives + 1}`,
            config: {
              maxOutputSize: DEFAULT_MAX_OUTPUT_SIZE,
            },
          }),
        }),
        prisma.dataChannel.create({
          data: {
            destinationId: archiveId,
          },
        }),
        prisma.nodeOutput.create({
          data: {
            id: entriesOutputId,
            nodeId: archiveId,
            label: ArchiveOutputs.Entries,
          },
        }),
        prisma.dataChannel.create({
          data: {
            originId: entriesOutputId,
            destinationId: datasetNode.id,
          },
        }),
        prisma.datasetFileUpload.create({
          data: {
            nodeId: archiveId,
            blobName: input.blobName,
            status: "PENDING",
            fileName: input.fileName,
            fileSize: input.fileSize,
            uploadedAt: new Date(),
          },
        }),
      ]);

      await processNode.enqueue({ nodeId: archiveId, nodeType: "Archive" });
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

      const { dataset } = await prisma.datasetFileUpload.findUniqueOrThrow({
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

      if (!dataset) return error("Dataset not found");

      await requireCanModifyProject(dataset.projectId, ctx);

      await prisma.datasetFileUpload.updateMany({
        where: {
          id: {
            in: input.fileUploadIds,
          },
          datasetId: dataset.id,
        },
        data: {
          visible: false,
        },
      });
    }),
});
