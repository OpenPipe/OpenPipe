import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { sql } from "kysely";

import { protectedProcedure } from "~/server/api/trpc";
import { kysely, prisma } from "~/server/db";
import { requireCanViewProject, requireCanModifyProject } from "~/utils/accessControl";
import { error, success } from "~/utils/errorHandling/standardResponses";
import { typedNode } from "~/server/utils/nodes/node.types";
import { getArchives, getMonitors } from "~/server/utils/nodes/relationalQueries";

export const listSources = protectedProcedure
  .input(z.object({ datasetId: z.string() }))
  .query(async ({ input, ctx }) => {
    const datasetNode = await kysely
      .selectFrom("Dataset as d")
      .where("d.id", "=", input.datasetId)
      .innerJoin("Node as n", "n.id", "d.nodeId")
      .selectAll("n")
      .executeTakeFirst()
      .then((node) => (node ? typedNode({ ...node, type: "Dataset" }) : null));

    if (!datasetNode) throw new TRPCError({ code: "NOT_FOUND", message: "Dataset not found" });

    await requireCanViewProject(datasetNode.projectId, ctx);

    const archives = await getArchives({
      datasetManualRelabelNodeId: datasetNode.config.manualRelabelNodeId,
    })
      .leftJoin("DatasetFileUpload as dfu", "dfu.nodeId", "archiveNode.id")
      .where("dfu.errorMessage", "is", null)
      .innerJoin("DataChannel as dc", "dc.destinationId", "archiveNode.id")
      .leftJoin("NodeEntry as ne", "dc.id", "ne.dataChannelId")
      .groupBy(["archiveNode.id", "llmRelabelNode.id"])
      .distinctOn("archiveNode.createdAt")
      .selectAll("archiveNode")
      .select([
        "llmRelabelNode.id as llmRelabelNodeId",
        "llmRelabelNode.config as llmRelabelNodeConfig",
        sql<number>`SUM(CASE WHEN ne.split = 'TRAIN' THEN 1 ELSE 0 END)::int`.as("numTrainEntries"),
        sql<number>`SUM(CASE WHEN ne.split = 'TEST' THEN 1 ELSE 0 END)::int`.as("numTestEntries"),
      ])
      .orderBy("archiveNode.createdAt", "desc")
      .execute()
      .then((archives) =>
        archives.map((archive) => ({
          ...archive,
          relabelOption: typedNode({
            type: "LLMRelabel",
            config: archive.llmRelabelNodeConfig,
          }).config.relabelLLM,
        })),
      );

    const monitors = await getMonitors({
      datasetManualRelabelNodeId: datasetNode.config.manualRelabelNodeId,
    })
      .innerJoin("DataChannel as dc", "dc.destinationId", "monitorNode.id")
      .leftJoin("NodeEntry as ne", "dc.id", "ne.dataChannelId")
      .groupBy(["monitorNode.id", "llmRelabelNode.id"])
      .distinctOn("monitorNode.createdAt")
      .selectAll("monitorNode")
      .select([
        "llmRelabelNode.id as llmRelabelNodeId",
        "llmRelabelNode.config as llmRelabelNodeConfig",
        sql<number>`SUM(CASE WHEN ne.split = 'TRAIN' THEN 1 ELSE 0 END)::int`.as("numTrainEntries"),
        sql<number>`SUM(CASE WHEN ne.split = 'TEST' THEN 1 ELSE 0 END)::int`.as("numTestEntries"),
      ])
      .orderBy("monitorNode.createdAt", "desc")
      .execute()
      .then((monitors) =>
        monitors.map((archive) => ({
          ...archive,
          relabelOption: typedNode({
            type: "LLMRelabel",
            config: archive.llmRelabelNodeConfig,
          }).config.relabelLLM,
        })),
      );

    return [...monitors, ...archives];
  });

export const removeSource = protectedProcedure
  .input(
    z.object({
      datasetId: z.string(),
      sourceLLMRelabelNodeId: z.string(),
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

    const tDatasetNode = typedNode({ ...datasetNode, type: "Dataset" });

    const sourceLLMRelabelNode = await kysely
      .selectFrom("Node as n")
      .where("n.id", "=", input.sourceLLMRelabelNodeId)
      .innerJoin("NodeOutput as no", "n.id", "no.nodeId")
      .select(["no.id as nodeOutputId"])
      .executeTakeFirst();

    if (!sourceLLMRelabelNode) return error("Source node not found");

    await kysely
      .deleteFrom("DataChannel")
      .where("originId", "=", sourceLLMRelabelNode.nodeOutputId)
      .where("destinationId", "=", tDatasetNode.config.manualRelabelNodeId)
      .execute();

    return success("Source removed");
  });
