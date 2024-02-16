import { z } from "zod";
import { sql } from "kysely";
import { jsonObjectFrom, jsonArrayFrom } from "kysely/helpers/postgres";
import type { ComparisonModel } from "@prisma/client";
import { TRPCError } from "@trpc/server";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { kysely, prisma } from "~/server/db";
import { requireCanModifyProject, requireCanViewProject } from "~/utils/accessControl";
import { error, success } from "~/utils/errorHandling/standardResponses";
import { generateBlobUploadUrl } from "~/utils/azure/server";
import { env } from "~/env.mjs";
import { comparisonModels } from "~/utils/comparisonModels";
import { filtersSchema } from "~/types/shared.types";
import { constructNodeEntryFiltersQuery } from "~/server/utils/constructNodeEntryFiltersQuery";
import { DEFAULT_MAX_OUTPUT_SIZE, typedNode } from "~/server/utils/nodes/node.types";
import { enqueueProcessNode } from "~/server/tasks/nodes/processNode.task";
import { prepareIntegratedDatasetCreation } from "~/server/utils/nodes/nodeCreation/prepareIntegratedNodesCreation";
import { startDatasetTestJobs } from "~/server/utils/nodes/processNodes/startTestJobs";
import { prepareArchiveCreation } from "~/server/utils/nodes/nodeCreation/prepareNodeCreation";
import { getUpstreamSources } from "~/server/utils/nodes/relationalQueries";
import { baseModel } from "~/server/fineTuningProviders/types";
import { calculateCost } from "~/server/fineTuningProviders/supportedModels";
import { calculateNumEpochs } from "~/server/fineTuningProviders/openpipe/trainingConfig";
import { relabelOptions } from "~/server/utils/nodes/node.types";
import { checkNodeInput } from "~/server/utils/nodes/checkNodeInput";

export const datasetsRouter = createTRPCRouter({
  get: protectedProcedure.input(z.object({ id: z.string() })).query(async ({ input, ctx }) => {
    const dataset = await kysely
      .selectFrom("Dataset as d")
      .where("d.id", "=", input.id)
      .select((eb) => [
        "d.projectId",
        "d.nodeId",
        "d.id",
        "d.name",
        sql<ComparisonModel[]>`d."enabledComparisonModels"::text[]`.as("enabledComparisonModels"),
        jsonObjectFrom(
          eb
            .selectFrom("Project as p")
            .whereRef("p.id", "=", "d.projectId")
            .select(["p.id", "p.name"]),
        ).as("project"),
        jsonObjectFrom(
          eb.selectFrom("Node as n").whereRef("n.id", "=", "d.nodeId").selectAll("n"),
        ).as("node"),
        jsonArrayFrom(
          eb
            .selectFrom("DatasetEval as de")
            .where("de.datasetId", "=", input.id)
            .orderBy("de.createdAt", "desc")
            .selectAll("de"),
        ).as("datasetEvals"),
        jsonArrayFrom(
          eb
            .selectFrom("FineTune as ft")
            .where("ft.datasetId", "=", input.id)
            .where("ft.status", "=", "DEPLOYED")
            .orderBy("ft.createdAt", "desc")
            .selectAll("ft"),
        ).as("deployedFineTunes"),
        eb
          .selectFrom("NodeEntry as ne")
          .whereRef("ne.nodeId", "=", "d.nodeId")
          .where("ne.status", "=", "PROCESSED")
          .where("ne.split", "=", "TEST")
          .select(sql<number>`count(*)::int`.as("count"))
          .as("numTestEntries"),
      ])
      .executeTakeFirst();

    if (!dataset?.nodeId || !dataset?.node)
      throw new TRPCError({ message: "Dataset node not found", code: "NOT_FOUND" });

    await requireCanViewProject(dataset.projectId, ctx);

    const tNode = typedNode(dataset.node);

    if (tNode.type !== "Dataset")
      throw new TRPCError({ message: "Node incorrect type", code: "NOT_FOUND" });

    const manualRelabelNode = await kysely
      .selectFrom("Node as n")
      .where("n.id", "=", tNode.config.manualRelabelNodeId)
      .select((eb) => [
        eb
          .selectFrom("NodeEntry as ne")
          .whereRef("ne.nodeId", "=", "n.id")
          .where("ne.status", "!=", "PROCESSED")
          .select(sql<number>`count(*)::int`.as("count"))
          .as("numProcessingEntries"),
      ])
      .executeTakeFirst();

    if (!manualRelabelNode)
      throw new TRPCError({ message: "Manual relabeling node not found", code: "NOT_FOUND" });

    const llmRelabelNode = await kysely
      .selectFrom("Node as n")
      .where("n.id", "=", tNode.config.llmRelabelNodeId)
      .selectAll("n")
      .select((eb) => [
        eb
          .selectFrom("NodeEntry as ne")
          .whereRef("ne.nodeId", "=", "n.id")
          .where("ne.status", "!=", "PROCESSED")
          .select(sql<number>`count(*)::int`.as("count"))
          .as("numRelabelingEntries"),
      ])
      .executeTakeFirst();

    if (!llmRelabelNode)
      throw new TRPCError({ message: "LLM relabeling model not found", code: "NOT_FOUND" });

    const tLlmRelabelNode = typedNode(llmRelabelNode);

    if (tLlmRelabelNode.type !== "LLMRelabel")
      throw new TRPCError({ message: "Node incorrect type", code: "NOT_FOUND" });

    const numRelabelingEntries =
      (tLlmRelabelNode.numRelabelingEntries ?? 0) + (manualRelabelNode.numProcessingEntries ?? 0);

    const archives = await getUpstreamSources({ llmRelabelNodeId: tNode.config.llmRelabelNodeId })
      .where("sourceNode.type", "=", "Archive")
      .select(["sourceNode.id", "sourceNode.name"])
      .execute();
    return {
      ...dataset,
      relabelLLM: tLlmRelabelNode.config.relabelLLM,
      numRelabelingEntries,
      archives,
    };
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
      const { projectId, nodeId } = await prisma.dataset.findUniqueOrThrow({
        where: { id: datasetId },
      });

      if (!nodeId) throw new TRPCError({ message: "Dataset node not found", code: "NOT_FOUND" });

      await requireCanViewProject(projectId, ctx);

      const baseQuery = constructNodeEntryFiltersQuery({ filters, datasetNodeId: nodeId }).where(
        "ne.split",
        "=",
        "TRAIN",
      );

      const datasetCalculationInProgress = await baseQuery
        .where((eb) =>
          eb.or([eb("dei.inputTokens", "is", null), eb("deo.outputTokens", "is", null)]),
        )
        .select("id")
        .executeTakeFirst();

      if (datasetCalculationInProgress) {
        return { cost: 0, calculating: true };
      }

      const datasetEntryStats = await baseQuery
        .select([
          sql<number>`count(ne.id)::int`.as("numEntries"),
          sql<number>`sum(dei."inputTokens")::int`.as("totalInputTokens"),
          sql<number>`sum(deo."outputTokens")::int`.as("totalOutputTokens"),
        ])
        .executeTakeFirst();

      if (!datasetEntryStats?.numEntries) return { cost: 0, calculating: false };

      let totalMatchTokens = 0;

      if (pruningRuleIds.length > 0) {
        totalMatchTokens = await baseQuery
          .innerJoin("NewPruningRuleMatch as prm", (join) =>
            join
              .onRef("prm.inputHash", "=", "ne.inputHash")
              .on("prm.pruningRuleId", "in", pruningRuleIds),
          )
          .leftJoin("PruningRule as pr", "prm.pruningRuleId", "pr.id")
          .select(sql<number>`sum(pr."tokensInText")::int`.as("totalMatchTokens"))
          .executeTakeFirst()
          .then((stats) => stats?.totalMatchTokens || 0);
      }

      const trainingTokens =
        datasetEntryStats.totalInputTokens - totalMatchTokens + datasetEntryStats.totalOutputTokens;
      const { cost } = calculateCost(baseModel, trainingTokens, 0, 0);

      const numEpochs = selectedNumberOfEpochs || calculateNumEpochs(datasetEntryStats.numEntries);

      return {
        cost: cost * numEpochs,
        calculating: false,
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
          sql<number>`(select count(*) from "NodeEntry" where "nodeId" = d."nodeId" and "status" = 'PROCESSED')::int`.as(
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
      const { projectId, nodeId } = await prisma.dataset.findUniqueOrThrow({
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
          nodeEntryBaseQuery: kysely
            .selectFrom("NodeEntry as ne")
            .where("ne.nodeId", "=", nodeId)
            .where("ne.split", "=", "TEST")
            .where("ne.status", "=", "PROCESSED"),
        });
      }

      return success("Dataset updated");
    }),

  updateRelabelingModel: protectedProcedure
    .input(
      z.object({
        datasetId: z.string(),
        relabelOption: z.enum(relabelOptions),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const { projectId } = await prisma.dataset.findUniqueOrThrow({
        where: { id: input.datasetId },
      });
      await requireCanModifyProject(projectId, ctx);

      const datasetNode = await kysely
        .selectFrom("Dataset as d")
        .where("d.id", "=", input.datasetId)
        .innerJoin("Node as n", "n.id", "d.nodeId")
        .selectAll("n")
        .executeTakeFirst();

      if (!datasetNode) return error("Dataset not found");

      const tDatasetNode = typedNode(datasetNode);

      if (tDatasetNode.type !== "Dataset") return error("Node incorrect type");

      const llmRelabelNode = await kysely
        .selectFrom("Node as n")
        .where("n.id", "=", tDatasetNode.config.llmRelabelNodeId)
        .selectAll("n")
        .executeTakeFirst();

      if (!llmRelabelNode) return error("Relabeling model not found");

      const tLlmRelabelNode = typedNode(llmRelabelNode);

      if (tLlmRelabelNode.type !== "LLMRelabel") return error("Node incorrect type");

      if (tLlmRelabelNode.config.relabelLLM === input.relabelOption)
        return success("Dataset relabeling model already set to this option");

      await prisma.node.update({
        where: { id: tLlmRelabelNode.id },
        data: checkNodeInput({
          ...tLlmRelabelNode,
          config: {
            ...tLlmRelabelNode.config,
            relabelLLM: input.relabelOption,
          },
        }),
      });

      await enqueueProcessNode({
        nodeId: tLlmRelabelNode.id,
        nodeType: "LLMRelabel",
        invalidateData: true,
      });

      return success("Dataset relabeling model updated");
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

      const tDatasetNode = typedNode(datasetNode);

      if (tDatasetNode.type !== "Dataset") return error("Node incorrect type");

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
            destinationId: tDatasetNode.config.llmRelabelNodeId,
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

      await enqueueProcessNode({ nodeId: archiveNodeId, nodeType: "Archive" });
    }),
  listFileUploads: protectedProcedure
    .input(z.object({ datasetId: z.string() }))
    .query(async ({ input, ctx }) => {
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

      if (!archives.length) return [];

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

      const { node } = await prisma.datasetFileUpload.findUniqueOrThrow({
        where: { id: input.fileUploadIds[0] },
        select: {
          node: {
            select: {
              id: true,
              projectId: true,
            },
          },
        },
      });

      if (!node) return error("Node not found");

      await requireCanModifyProject(node.projectId, ctx);

      await prisma.datasetFileUpload.updateMany({
        where: {
          id: {
            in: input.fileUploadIds,
          },
        },
        data: {
          visible: false,
        },
      });
    }),
});
