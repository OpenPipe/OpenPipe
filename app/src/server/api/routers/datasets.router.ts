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
import { comparisonModels } from "~/utils/comparisonModels";
import { filtersSchema } from "~/types/shared.types";
import { constructNodeDataFiltersQuery } from "~/server/utils/constructNodeDataFiltersQuery";
import {
  ArchiveOutputs,
  DEFAULT_MAX_OUTPUT_SIZE,
  typedNode,
} from "~/server/utils/nodes/node.types";
import { processNode } from "~/server/tasks/nodes/processNode.task";
import { checkNodeInput } from "~/server/utils/nodes/checkNodeInput";
import { prepareIntegratedDatasetCreation } from "~/server/utils/nodes/nodeCreation/prepareIntegratedNodesCreation";
import { startDatasetTestJobs } from "~/server/utils/nodes/processNodes/startTestJobs";
import { prepareArchiveCreation } from "~/server/utils/nodes/nodeCreation/prepareNodeCreation";
import { getUpstreamSources } from "~/server/utils/nodes/relationalQueries";
import { constructDatasetEntryFiltersQuery } from "~/server/utils/constructDatasetEntryFiltersQuery";
import { baseModel } from "~/server/fineTuningProviders/types";
import { calculateCost } from "~/server/fineTuningProviders/supportedModels";
import { calculateNumEpochs } from "~/server/fineTuningProviders/openpipe/trainingConfig";

export const datasetsRouter = createTRPCRouter({
  get: protectedProcedure.input(z.object({ id: z.string() })).query(async ({ input, ctx }) => {
    const dataset = await prisma.dataset.findUniqueOrThrow({
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
    });

    if (!dataset.nodeId) return error("Dataset node not found");

    const numTestEntries = await prisma.nodeData.count({
      where: {
        nodeId: dataset.nodeId,
        status: "PROCESSED",
        split: "TEST",
      },
    });

    await requireCanViewProject(dataset.projectId, ctx);

    const { fineTunes, ...rest } = dataset;
    return { deployedFineTunes: fineTunes, numTestEntries, ...rest };
  }),
  getTrainingCosts: protectedProcedure
    .input(
      z.object({
        datasetId: z.string(),
        baseModel: baseModel,
        filters: filtersSchema,
        pruningRuleIds: z.array(z.string()),
        selectedNumberOfEpochs: z.number().min(1).max(20).optional(),
      }),
    )
    .query(async ({ input, ctx }) => {
      const { datasetId, filters, baseModel, pruningRuleIds, selectedNumberOfEpochs } = input;
      const { projectId } = await prisma.dataset.findUniqueOrThrow({
        where: { id: datasetId },
      });

      await requireCanViewProject(projectId, ctx);

      const baseQuery = constructDatasetEntryFiltersQuery({ filters, datasetId })
        .where("de.split", "=", "TRAIN")
        .where("de.output", "is not", null);

      const datasetEntryStats = await baseQuery
        .select([
          sql<number>`count(de.id)::int`.as("numEntries"),
          sql<number>`sum(de."inputTokens")::int`.as("totalInputTokens"),
          sql<number>`sum(de."outputTokens")::int`.as("totalOutputTokens"),
        ])
        .executeTakeFirst();

      if (!datasetEntryStats) return;

      let totalMatchTokens = 0;

      if (pruningRuleIds.length > 0) {
        totalMatchTokens = await baseQuery
          .innerJoin("PruningRuleMatch", (join) =>
            join
              .onRef("PruningRuleMatch.datasetEntryId", "=", "de.id")
              .on("PruningRuleMatch.pruningRuleId", "in", pruningRuleIds),
          )
          .leftJoin("PruningRule as pr", "PruningRuleMatch.pruningRuleId", "pr.id")
          .select(sql<number>`sum(pr."tokensInText")::int`.as("totalMatchTokens"))
          .executeTakeFirst()
          .then((stats) => stats?.totalMatchTokens || 0);
      }

      const { cost } = calculateCost(
        baseModel,
        0,
        datasetEntryStats.totalInputTokens - totalMatchTokens,
        datasetEntryStats.totalOutputTokens,
      );

      const numEpochs = selectedNumberOfEpochs || calculateNumEpochs(datasetEntryStats.numEntries);

      return {
        cost: cost * numEpochs,
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
          sql<number>`(select count(*) from "NodeData" where "nodeId" = d."nodeId" and status = "PROCESSED")::int`.as(
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

      const { prismaCreations, datasetId } = prepareIntegratedDatasetCreation({
        projectId: input.projectId,
        datasetName: input.name,
      });

      await prisma.$transaction(prismaCreations);

      return success(datasetId);
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
        await startDatasetTestJobs({
          datasetId: input.id,
          nodeDataBaseQuery: kysely
            .selectFrom("NodeData as nd")
            .where("nd.nodeId", "=", input.id)
            .where("nd.split", "=", "TEST")
            .where("nd.status", "=", "PROCESSED"),
        });
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

      const datasetNode = await kysely
        .selectFrom("Dataset as d")
        .where("d.id", "=", input.id)
        .innerJoin("Node as n", "n.id", "d.nodeId")
        .selectAll("n")
        .executeTakeFirst();

      if (!datasetNode) return error("Dataset not found");

      const tNode = typedNode(datasetNode);

      if (tNode.type !== "Dataset") return error("Node incorrect type");

      await prisma.$transaction([
        prisma.dataset.delete({
          where: { id: input.id },
        }),
        prisma.node.delete({
          where: { id: tNode.id },
        }),
        prisma.node.delete({
          where: { id: tNode.config.llmRelabelNodeId },
        }),
        prisma.node.delete({
          where: { id: tNode.config.manualRelabelNodeId },
        }),
      ]);

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

      const datasetNode = await kysely
        .selectFrom("Dataset as d")
        .where("d.id", "=", input.datasetId)
        .innerJoin("Node as n", "n.id", "d.nodeId")
        .selectAll("n")
        .executeTakeFirst();

      if (!datasetNode) return error("Dataset not found");

      const { prismaCreations, archiveNodeId, entriesOutputId } = prepareArchiveCreation({
        nodeParams: {
          projectId,
          name: `Archive ${numArchives + 1}`,
          config: {
            maxOutputSize: DEFAULT_MAX_OUTPUT_SIZE,
          },
        },
      });

      await prisma.$transaction([
        ...prismaCreations,
        prisma.dataChannel.create({
          data: {
            originId: entriesOutputId,
            destinationId: datasetNode.id,
          },
        }),
        prisma.datasetFileUpload.create({
          data: {
            nodeId: archiveNodeId,
            blobName: input.blobName,
            status: "PENDING",
            fileName: input.fileName,
            fileSize: input.fileSize,
            uploadedAt: new Date(),
          },
        }),
      ]);

      await processNode.enqueue({ nodeId: archiveNodeId, nodeType: "Archive" });
    }),
  listFileUploads: protectedProcedure
    .input(z.object({ datasetId: z.string() }))
    .query(async ({ input, ctx }) => {
      // const { projectId, nodeId } = await prisma.dataset.findUniqueOrThrow({
      //   where: { id: input.datasetId },
      // });
      // await requireCanViewProject(projectId, ctx);

      // if (!nodeId) return error("Dataset node not found");

      const datasetNode = await kysely
        .selectFrom("Dataset as d")
        .where("d.id", "=", input.datasetId)
        .innerJoin("Node as n", "n.id", "d.nodeId")
        .select(["n.projectId", "n.type", "n.config"])
        .executeTakeFirst();

      if (!datasetNode) {
        throw new Error("Node not found");
      }

      await requireCanViewProject(datasetNode.projectId, ctx);

      const tNode = typedNode(datasetNode);
      if (tNode.type !== "Dataset") {
        throw new Error("Node is not a Dataset");
      }

      const { llmRelabelNodeId } = tNode.config;

      const archives = await getUpstreamSources({ llmRelabelNodeId })
        .where("sourceNode.type", "=", "Archive")
        .select(["sourceNode.id as sourceNodeId"])
        .execute();

      return await prisma.datasetFileUpload.findMany({
        where: {
          nodeId: {
            in: archives.map((a) => a.sourceNodeId),
          },
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
