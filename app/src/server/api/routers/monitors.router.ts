import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import { sql } from "kysely";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { kysely, prisma } from "~/server/db";
import { requireCanModifyProject, requireCanViewProject } from "~/utils/accessControl";
import { TRPCError } from "@trpc/server";
import { filtersSchema } from "~/types/shared.types";
import { relabelOptions, typedNode } from "~/server/utils/nodes/node.types";
import { success } from "~/utils/errorHandling/standardResponses";
import { getDownstreamDatasets } from "~/server/utils/nodes/relationalQueries";
import { checkNodeInput } from "~/server/utils/nodes/checkNodeInput";
import { enqueueProcessNode } from "~/server/tasks/nodes/processNodes/processNode.task";
import { prepareIntegratedMonitorCeation } from "~/server/utils/nodes/nodeCreation/prepareIntegratedNodesCreation";
import { convertCache } from "~/server/utils/nodes/convertCache";
import { hashNode } from "~/server/utils/nodes/hashNode";
import { LLMRelabelOutput } from "~/server/utils/nodes/nodeProperties/llmRelabelProperties";

export const monitorsRouter = createTRPCRouter({
  get: protectedProcedure.input(z.object({ id: z.string() })).query(async ({ input, ctx }) => {
    const monitor = await kysely
      .selectFrom("Node as n")
      .where("n.id", "=", input.id)
      .where("n.type", "=", "Monitor")
      .selectAll("n")
      .select((eb) => [
        eb
          .selectFrom("NodeEntry as ne")
          .innerJoin("DataChannel as dc", (join) =>
            join.onRef("dc.id", "=", "ne.dataChannelId").onRef("dc.destinationId", "=", "n.id"),
          )
          .where("ne.status", "!=", "PROCESSED")
          .select(sql<number>`count(*)::int`.as("count"))
          .as("numUnprocessedEntries"),
      ])
      .select((eb) => [
        eb
          .selectFrom("NodeEntry as ne")
          .innerJoin("DataChannel as dc", (join) =>
            join.onRef("dc.id", "=", "ne.dataChannelId").onRef("dc.destinationId", "=", "n.id"),
          )
          .where("ne.status", "=", "PROCESSED")
          .select(sql<number>`count(*)::int`.as("count"))
          .as("numProcessedEntries"),
      ])
      .executeTakeFirst()
      .then((monitor) => (monitor ? typedNode({ ...monitor, type: "Monitor" }) : undefined));

    if (!monitor) throw new TRPCError({ code: "NOT_FOUND" });

    await requireCanViewProject(monitor.projectId, ctx);

    const filter = await kysely
      .selectFrom("Node as n")
      .where("n.id", "=", monitor.config.filterNodeId)
      .where("n.type", "=", "Filter")
      .selectAll("n")
      .executeTakeFirst()
      .then((filter) => (filter ? typedNode({ ...filter, type: "Filter" }) : undefined));

    if (!filter) throw new TRPCError({ code: "NOT_FOUND" });

    const llmRelabel = await kysely
      .selectFrom("Node as n")
      .where("n.id", "=", monitor.config.relabelNodeId)
      .where("n.type", "=", "LLMRelabel")
      .selectAll("n")
      .select((eb) => [
        eb
          .selectFrom("NodeEntry as ne")
          .innerJoin("DataChannel as dc", (join) =>
            join.onRef("dc.id", "=", "ne.dataChannelId").onRef("dc.destinationId", "=", "n.id"),
          )
          .where("ne.status", "=", "PROCESSED")
          .select(sql<number>`count(*)::int`.as("count"))
          .as("numProcessedEntries"),
      ])
      .executeTakeFirst()
      .then((relabelNode) =>
        relabelNode ? typedNode({ ...relabelNode, type: "LLMRelabel" }) : undefined,
      );

    if (!llmRelabel) throw new TRPCError({ code: "NOT_FOUND" });

    const numIncomingEntries =
      (monitor.numUnprocessedEntries ?? 0) +
      Math.max(0, (monitor.numProcessedEntries ?? 0) - (llmRelabel.numProcessedEntries ?? 0));

    const datasets = await getDownstreamDatasets({
      monitorLLMRelabelNodeId: monitor.config.relabelNodeId,
    })
      .selectAll("d")
      .select(["datasetNode.config as nodeConfig"])
      .distinctOn(["dc1.createdAt"])
      .orderBy("dc1.createdAt", "asc")
      .execute()
      .then((datasets) =>
        datasets.map((dataset) => ({
          ...dataset,
          node: typedNode({ config: dataset.nodeConfig, type: "Dataset" }),
        })),
      );

    return {
      ...monitor,
      filter,
      llmRelabel,
      numIncomingEntries,
      numFullyProcessedEntries: llmRelabel.numProcessedEntries,
      datasets,
    };
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
        .selectAll("n")
        .select((eb) => [
          eb
            .selectFrom("DataChannel as dc")
            .whereRef("dc.destinationId", "=", "n.id")
            .innerJoin("NodeEntry as ne", "ne.dataChannelId", "dc.id")
            .select(sql<number>`count(*)::int`.as("numEntries"))
            .as("numEntries"),
        ])
        .orderBy("n.createdAt", "desc")
        .execute()
        .then((monitors) => monitors.map((monitor) => typedNode({ ...monitor, type: "Monitor" })));

      const numDatasets = await Promise.all(
        monitors.map((monitor) =>
          getDownstreamDatasets({ monitorLLMRelabelNodeId: monitor.config.relabelNodeId })
            .groupBy(["monitorLLMRelabelNode.id", "datasetNode.id"])
            .select(sql<number>`count("datasetNode".id)::int`.as("count"))
            .executeTakeFirst(),
        ),
      );

      return monitors.map((monitor, i) => ({
        ...monitor,
        numDatasets: numDatasets[i]?.count ?? 0,
      }));
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

      const preparedIntegratedMonitorCreation = prepareIntegratedMonitorCeation({
        projectId,
        initialFilters,
      });

      await prisma.$transaction(preparedIntegratedMonitorCreation.prismaCreations);

      return success(preparedIntegratedMonitorCreation.monitorNodeId);
    }),
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        updates: z.object({
          name: z.string().optional(),
          initialFilters: filtersSchema.optional(),
          sampleRate: z.number().optional(),
          maxOutputSize: z.number().optional(),
          checkFilters: filtersSchema.optional(),
          relabelLLM: z.enum(relabelOptions).optional(),
          datasetManualRelabelNodeIds: z.array(z.string()).optional(),
        }),
        preserveCache: z.boolean().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const {
        id,
        updates: {
          name,
          initialFilters,
          sampleRate,
          maxOutputSize,
          checkFilters,
          datasetManualRelabelNodeIds,
        },
        preserveCache,
      } = input;

      const monitor = await kysely
        .selectFrom("Node as n")
        .where("n.id", "=", id)
        .selectAll("n")
        .executeTakeFirst()
        .then((monitor) => (monitor ? typedNode({ ...monitor, type: "Monitor" }) : undefined));

      if (!monitor) throw new TRPCError({ code: "NOT_FOUND" });

      await requireCanModifyProject(monitor.projectId, ctx);

      const filter = await kysely
        .selectFrom("Node as n")
        .where("n.id", "=", monitor.config.filterNodeId)
        .selectAll("n")
        .executeTakeFirst()
        .then((filter) => (filter ? typedNode({ ...filter, type: "Filter" }) : undefined));

      if (!filter) throw new TRPCError({ code: "NOT_FOUND" });

      const llmRelabel = await kysely
        .selectFrom("Node as n")
        .where("n.id", "=", monitor.config.relabelNodeId)
        .innerJoin("NodeOutput as no", "no.nodeId", "n.id")
        .where("no.label", "=", LLMRelabelOutput.Relabeled)
        .selectAll("n")
        .select(["no.id as relabeledLLMOutputId"])
        .executeTakeFirst()
        .then((llmRelabel) =>
          llmRelabel ? typedNode({ ...llmRelabel, type: "LLMRelabel" }) : undefined,
        );

      if (!llmRelabel) throw new TRPCError({ code: "NOT_FOUND" });

      let shouldReprocess = false;

      const initialMonitorHash = monitor.hash;

      const updatedMonitorData = {
        id,
        projectId: monitor.projectId,
        name,
        type: "Monitor" as const,
        config: {
          ...monitor.config,
          initialFilters: initialFilters ?? monitor.config.initialFilters,
          sampleRate: sampleRate ?? monitor.config.sampleRate,
          maxOutputSize: maxOutputSize ?? monitor.config.maxOutputSize,
        },
      };

      const hashUpdated = initialMonitorHash !== hashNode(updatedMonitorData);
      if (hashUpdated) shouldReprocess = true;
      const invalidateMonitor = hashUpdated && !preserveCache;

      await prisma.node.update({
        where: { id },
        data: checkNodeInput(updatedMonitorData),
      });

      const { hash: updatedFilterHash } = await prisma.node.update({
        where: { id: monitor.config.filterNodeId },
        data: checkNodeInput({
          id: monitor.config.filterNodeId,
          projectId: monitor.projectId,
          type: "Filter",
          config: {
            ...filter.config,
            filters: checkFilters ?? filter.config.filters,
          },
        }),
      });

      const filterChecksUpdated = updatedFilterHash !== filter.hash;

      if (filterChecksUpdated) {
        shouldReprocess = true;
        if (preserveCache) {
          await convertCache({
            nodeHash: filter.hash,
            nodeId: filter.id,
          });
        } else {
          await prisma.node.update({
            where: { id: filter.id },
            data: {
              stale: true,
            },
          });
        }
      }

      const relabelLLMUpdated =
        input.updates.relabelLLM && input.updates.relabelLLM !== llmRelabel.config.relabelLLM;

      if (relabelLLMUpdated) {
        shouldReprocess = true;
        await prisma.node.update({
          where: { id: monitor.config.relabelNodeId },
          data: {
            stale: true,
            config: {
              ...llmRelabel.config,
              relabelLLM: input.updates.relabelLLM,
            },
          },
        });
      }

      if (datasetManualRelabelNodeIds) {
        shouldReprocess = true;
        const existingDatasetManualRelabelNodeIds = await getDownstreamDatasets({
          monitorLLMRelabelNodeId: llmRelabel.id,
        })
          .select(["manualRelabelNode.id"])
          .execute()
          .then((nodes) => nodes.map((node) => node.id));

        const nodeIdsToConnect = datasetManualRelabelNodeIds.filter(
          (id) => !existingDatasetManualRelabelNodeIds.includes(id),
        );

        if (nodeIdsToConnect.length) {
          await kysely
            .insertInto("DataChannel")
            .columns(["originId", "destinationId"])
            .values(
              nodeIdsToConnect.map((nodeId) => ({
                id: uuidv4(),
                originId: llmRelabel.relabeledLLMOutputId,
                destinationId: nodeId,
                updatedAt: new Date(),
              })),
            )
            .execute();
        }

        const nodeIdsToDisconnect = existingDatasetManualRelabelNodeIds.filter(
          (id) => !datasetManualRelabelNodeIds.includes(id),
        );

        if (nodeIdsToDisconnect.length) {
          await kysely
            .deleteFrom("DataChannel")
            .where("originId", "=", llmRelabel.relabeledLLMOutputId)
            .where("destinationId", "in", nodeIdsToDisconnect)
            .execute();
        }
      }

      if (shouldReprocess)
        await enqueueProcessNode({ nodeId: id, invalidateData: invalidateMonitor });

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

      const tMonitor = typedNode({ ...monitor, type: "Monitor" });

      await requireCanModifyProject(monitor.projectId, ctx);

      await prisma.$transaction([
        prisma.node.delete({
          where: { id: tMonitor.config.relabelNodeId },
        }),
        prisma.node.delete({
          where: { id: tMonitor.config.filterNodeId },
        }),
        prisma.node.delete({
          where: { id: input.id },
        }),
      ]);

      return success("Monitor deleted");
    }),
});
