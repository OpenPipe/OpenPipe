import { z } from "zod";
import { v4 as uuidv4 } from "uuid";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { kysely, prisma } from "~/server/db";
import { requireCanModifyProject, requireCanViewProject } from "~/utils/accessControl";
import { TRPCError } from "@trpc/server";
import { filtersSchema } from "~/types/shared.types";
import {
  DEFAULT_MAX_OUTPUT_SIZE,
  MonitorOutputs,
  typedNode,
} from "~/server/utils/nodes/node.types";
import { success } from "~/utils/errorHandling/standardResponses";
import { getDescendantNodes, getDownstreamDatasets } from "~/server/utils/nodes/relationalQueries";
import { checkNodeInput } from "~/server/utils/nodes/checkNodeInput";
import { prepareMonitorCreation } from "~/server/utils/nodes/nodeCreation/prepareNodeCreation";

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

    const datasets = await getDownstreamDatasets(monitor.id)
      .select(["datasetNode.id as datasetNodeId", "d.id as datasetId", "d.name as datasetName"])
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
        initialFilters: filtersSchema,
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const { projectId, initialFilters } = input;

      await requireCanModifyProject(projectId, ctx);

      const preparedMonitorCreation = prepareMonitorCreation({
        nodeParams: {
          name: "New Monitor",
          projectId,
          config: {
            initialFilters,
            checkFilters: initialFilters,
            lastLoggedCallUpdatedAt: new Date(0),
            maxEntriesPerMinute: 100,
            maxLLMConcurrency: 2,
            maxOutputSize: DEFAULT_MAX_OUTPUT_SIZE,
          },
        },
      });

      await prisma.$transaction(preparedMonitorCreation.prismaCreations);

      return preparedMonitorCreation.monitorNodeId;
    }),
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        updates: z.object({
          name: z.string().optional(),
          initialFilters: filtersSchema.optional(),
          checkFilters: filtersSchema.optional(),
          datasetLLMRelabelNodeIds: z.array(z.string()).optional(),
        }),
        preserveCache: z.boolean(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const {
        id,
        updates: { name, initialFilters, checkFilters, datasetLLMRelabelNodeIds },
        preserveCache,
      } = input;

      const monitor = await kysely
        .selectFrom("Node as n")
        .where("n.id", "=", id)
        .innerJoin("NodeOutput as dno", "dno.nodeId", "n.id")
        .where("dno.label", "=", MonitorOutputs.MatchedLogs)
        .selectAll("n")
        .select(["dno.id as matchedLogsOutputId"])
        .executeTakeFirst();

      if (!monitor) throw new TRPCError({ code: "NOT_FOUND" });

      const tMonitor = typedNode(monitor);

      if (tMonitor.type !== "Monitor") throw new TRPCError({ code: "BAD_REQUEST" });

      await requireCanModifyProject(tMonitor.projectId, ctx);

      const initialHash = tMonitor.hash;

      const { hash: updatedHash } = await prisma.node.update({
        where: { id },
        data: checkNodeInput({
          id,
          projectId: monitor.projectId,
          name,
          type: "Monitor",
          config: {
            ...tMonitor.config,
            initialFilters: initialFilters ?? tMonitor.config.initialFilters,
            checkFilters: checkFilters ?? tMonitor.config.checkFilters,
          },
        }),
      });

      if (preserveCache && monitor.hash !== updatedHash) {
        // check to see if cached data is being used by any other nodes
        const similarNodes = await prisma.node.findMany({
          where: {
            hash: updatedHash,
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
                  eb.val(updatedHash).as("nodeHash"), // Set the new nodeHash
                ])
                .where("nodeHash", "=", initialHash),
            )
            .onConflict((oc) =>
              oc.columns(["nodeHash", "incomingDEIHash", "incomingDEOHash"]).doNothing(),
            )
            .execute();
        } else {
          // update cached data
          await prisma.cachedProcessedNodeData.updateMany({
            where: {
              nodeHash: initialHash,
            },
            data: {
              nodeHash: updatedHash,
            },
          });
        }
      }

      if (datasetLLMRelabelNodeIds) {
        const existingDatasetLLMRelabelNodeIds = await getDownstreamDatasets(id)
          .select(["datasetLLMRelabelNode.id"])
          .execute()
          .then((nodes) => nodes.map((node) => node.id));

        const datasetLLMRelabelNodeIdsToConnect = datasetLLMRelabelNodeIds.filter(
          (id) => !existingDatasetLLMRelabelNodeIds.includes(id),
        );

        await kysely
          .insertInto("DataChannel")
          .columns(["originId", "destinationId"])
          .values(
            datasetLLMRelabelNodeIdsToConnect.map((llmRelabelNodeId) => ({
              id: uuidv4(),
              originId: tMonitor.matchedLogsOutputId,
              destinationId: llmRelabelNodeId,
              updatedAt: new Date(),
            })),
          )
          .execute();

        const datasetNodeIdsToDisconnect = existingDatasetLLMRelabelNodeIds.filter((id) =>
          datasetLLMRelabelNodeIds.includes(id),
        );

        await kysely
          .deleteFrom("DataChannel")
          .where("originId", "=", tMonitor.matchedLogsOutputId)
          .where("destinationId", "in", datasetNodeIdsToDisconnect)
          .execute();
      }

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
