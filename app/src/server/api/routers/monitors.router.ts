import { z } from "zod";
import { v4 as uuidv4 } from "uuid";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { kysely, prisma } from "~/server/db";
import { requireCanModifyProject, requireCanViewProject } from "~/utils/accessControl";
import { TRPCError } from "@trpc/server";
import { filtersSchema } from "~/types/shared.types";
import { hashNode } from "~/server/utils/nodes/hashNode";
import {
  LLMRelabelOutputs,
  MonitorOutputs,
  RelabelOptions,
  relabelOptions,
} from "~/server/utils/nodes/node.types";
import { success } from "~/utils/errorHandling/standardResponses";
import { getDescendantNodes } from "~/server/utils/nodes/queries";

export const monitorsRouter = createTRPCRouter({
  get: protectedProcedure.input(z.object({ id: z.string() })).query(async ({ input, ctx }) => {
    const monitor = await getDescendantNodes(input.id)
      .selectAll("originalNode")
      .select([
        "descendantNode.id as relabelindNodeId",
        "descendantNode.config as relabelingConfig",
      ])
      .executeTakeFirst();

    if (!monitor) throw new TRPCError({ code: "NOT_FOUND" });

    await requireCanViewProject(monitor.projectId, ctx);

    const datasets = await getDescendantNodes(monitor.relabelindNodeId)
      .where("descendantNode.type", "=", "Dataset")
      .innerJoin("Dataset as d", "d.nodeId", "descendantNode.id")
      .select(["descendantNode.id as nodeId", "d.id as datasetId", "d.name as datasetName"])
      .execute();

    return { monitor, datasets };
  }),
  list: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
      }),
    )
    .query(async ({ input, ctx }) => {
      await requireCanViewProject(input.projectId, ctx);

      const monitors = await kysely
        .selectFrom("Node as n")
        .where("n.projectId", "=", input.projectId)
        .where("n.type", "=", "Monitor")
        .orderBy("n.createdAt", "desc")
        .execute();

      return monitors;
    }),
  create: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        filters: filtersSchema,
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const { projectId, filters } = input;

      await requireCanModifyProject(projectId, ctx);

      const monitorId = uuidv4();
      const monitorHash = hashNode({ projectId, node: { type: "Monitor", config: { filters } } });

      const relabelId = uuidv4();
      const relabelHash = hashNode({
        projectId,
        node: {
          type: "LLMRelabel",
          config: {
            relabelLLM: RelabelOptions.SkipRelabel,
          },
        },
      });

      const numMonitors = await prisma.node.count({
        where: {
          projectId,
          type: "Monitor",
        },
      });

      const [monitor] = await prisma.$transaction([
        // Monitor
        prisma.node.create({
          data: {
            projectId,
            type: "Monitor",
            name: `Monitor ${numMonitors + 1}`,
            config: { filters },
            hash: monitorHash,
          },
        }),
        prisma.dataChannel.create({
          data: {
            destinationId: monitorId,
          },
        }),
        prisma.nodeOutput.create({
          data: {
            nodeId: monitorId,
            label: MonitorOutputs.MatchedLogs,
          },
        }),
        // LLMRelabel
        prisma.node.create({
          data: {
            id: relabelId,
            projectId: projectId,
            type: "LLMRelabel",
            name: `Relabel ${numMonitors + 1}`,
            config: {
              relabelLLM: RelabelOptions.SkipRelabel,
            },
            hash: relabelHash,
          },
        }),
        prisma.dataChannel.create({
          data: {
            originId: monitorId,
            destinationId: relabelId,
          },
        }),
        prisma.nodeOutput.create({
          data: {
            nodeId: relabelId,
            label: LLMRelabelOutputs.Relabeled,
          },
        }),
        prisma.nodeOutput.create({
          data: {
            nodeId: relabelId,
            label: LLMRelabelOutputs.Unprocessed,
          },
        }),
      ]);

      return monitor;
    }),
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string(),
        initialFilters: filtersSchema,
        checkFilters: filtersSchema,
        relabelLLM: z.enum(relabelOptions),
        outputDatasetIds: z.array(z.string()),
        preserveCache: z.boolean(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const {
        id,
        name,
        initialFilters,
        checkFilters,
        relabelLLM,
        outputDatasetIds,
        preserveCache,
      } = input;

      const monitor = await prisma.node.findUnique({
        where: { id },
      });

      if (!monitor) throw new TRPCError({ code: "NOT_FOUND" });

      await requireCanModifyProject(monitor.projectId, ctx);

      const nodeHash = hashNode({
        projectId: monitor.projectId,
        node: {
          type: "Monitor",
          config: { checkFilters },
        },
      });

      await prisma.node.update({
        where: { id },
        data: {
          name,
          config: { initialFilters, checkFilters },
          hash: nodeHash,
        },
      });

      if (preserveCache && monitor.hash !== nodeHash) {
        // check to see if cached data is being used by any other nodes
        const similarNodes = await prisma.node.findMany({
          where: {
            hash: nodeHash,
            id: { not: id },
          },
        });
        if (similarNodes.length) {
          // make new copies of the cached data
          await kysely
            .insertInto("CachedProcessedNodeData")
            .columns([
              "incomingDEIHash",
              "incomingDEOHash",
              "outgoingDEIHash",
              "outgoingDEOHash",
              "filterOutcome",
              "explanation",
              "createdAt",
              "updatedAt",
              "nodeHash",
            ])
            .expression((eb) =>
              eb
                .selectFrom("CachedProcessedNodeData")
                .select((eb) => [
                  "incomingDEIHash",
                  "incomingDEOHash",
                  "outgoingDEIHash",
                  "outgoingDEOHash",
                  "filterOutcome",
                  "explanation",
                  "createdAt",
                  "updatedAt",
                  eb.val(nodeHash).as("nodeHash"), // Set the new nodeHash
                ])
                .where("nodeHash", "=", monitor.hash),
            )
            .onConflict((oc) =>
              oc.columns(["nodeHash", "incomingDEIHash", "incomingDEOHash"]).doNothing(),
            )
            .execute();
        } else {
          // update cached data
          await prisma.cachedProcessedNodeData.updateMany({
            where: {
              nodeHash: monitor.hash,
            },
            data: {
              nodeHash,
            },
          });
        }
      }

      const relabelNode = await getDescendantNodes(monitor.id)
        .innerJoin("NodeOutput as dno", "dno.nodeId", "descendantNode.id")
        .where("dno.label", "=", LLMRelabelOutputs.Relabeled)
        .select([
          "descendantNode.id as id",
          "descendantNode.type as type",
          "descendantNode.hash as hash",
          "dno.id as relabelOutputId",
        ])
        .executeTakeFirst();

      if (!relabelNode)
        throw new TRPCError({ code: "NOT_FOUND", message: "Relabel node not found" });

      const relabelNodeHash = hashNode({
        projectId: monitor.projectId,
        node: {
          type: "LLMRelabel",
          config: {
            relabelLLM: relabelLLM,
          },
        },
      });
      if (relabelNodeHash !== relabelNode.hash) {
        await prisma.node.update({
          where: { id: relabelNode.id },
          data: {
            hash: relabelNodeHash,
            config: {
              relabelLLM: relabelLLM,
            },
          },
        });
      }

      const existingDatasetNodeIds = await getDescendantNodes(relabelNode.id)
        .where("descendantNode.type", "=", "Dataset")
        .select(["descendantNode.id as id"])
        .execute()
        .then((nodes) => nodes.map((node) => node.id));

      const datasetNodeIdsToConnect = outputDatasetIds.filter(
        (id) => !existingDatasetNodeIds.includes(id),
      );

      await kysely
        .insertInto("DataChannel")
        .columns(["originId", "destinationId"])
        .values(
          datasetNodeIdsToConnect.map((datasetId) => ({
            id: uuidv4(),
            originId: relabelNode.relabelOutputId,
            destinationId: datasetId,
            updatedAt: new Date(),
          })),
        )
        .execute();

      const datasetNodeIdsToDisconnect = existingDatasetNodeIds.filter((id) =>
        outputDatasetIds.includes(id),
      );

      await kysely
        .deleteFrom("DataChannel")
        .where("originId", "=", relabelNode.relabelOutputId)
        .where("destinationId", "in", datasetNodeIdsToDisconnect)
        .execute();

      return success("Monitor updated");
    }),
  delete: protectedProcedure
    .input(
      z.object({
        id: z.string(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const monitor = await prisma.node.findUnique({
        where: { id: input.id },
      });

      if (!monitor) throw new TRPCError({ code: "NOT_FOUND" });

      await requireCanModifyProject(monitor.projectId, ctx);

      await prisma.node.delete({
        where: { id: input.id },
      });

      return success("Monitor deleted");
    }),
});
