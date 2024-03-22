import { z } from "zod";
import { sql } from "kysely";
import { NodeEntryStatus, type Prisma } from "@prisma/client";
import { jsonObjectFrom } from "kysely/helpers/postgres";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { kysely, prisma } from "~/server/db";
import { requireCanModifyProject, requireCanViewProject } from "~/utils/accessControl";
import { TRPCError } from "@trpc/server";
import { filtersSchema } from "~/types/shared.types";
import { judgementCriteria, typedNode } from "~/server/utils/nodes/node.types";
import { success } from "~/utils/errorHandling/standardResponses";
import { getDownstreamDatasets } from "~/server/utils/nodes/relationalQueries";
import { checkNodeInput } from "~/server/utils/nodes/checkNodeInput";
import { enqueueProcessNode } from "~/server/tasks/nodes/processNodes/processNode.task";
import {
  prepareIntegratedMonitorCeation,
  prepareMonitorDatasetRelabelNode,
} from "~/server/utils/nodes/nodeCreation/prepareIntegratedNodesCreation";
import { convertCache } from "~/server/utils/nodes/convertCache";
import { hashNode } from "~/server/utils/nodes/hashNode";
import { FilterOutput } from "~/server/utils/nodes/nodeProperties/nodeProperties.types";
import { selectEntriesWithCache } from "~/server/tasks/nodes/processNodes/nodeEntryCache";

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

    const filteredEntryStats = await kysely
      .selectFrom(selectEntriesWithCache({ node: filter }).as("ne"))
      .select([
        sql<number>`count(case when ne."filterOutcome" = ${FilterOutput.Match} then 1 end)::int`.as(
          "numMatchedEntries",
        ),
        sql<number>`count(case when ne.status = ${NodeEntryStatus.PROCESSED} or ne.status = ${NodeEntryStatus.ERROR} then 1 end)::int`.as(
          "numProcessedEntries",
        ),
        sql<number>`count(ne.*)::int`.as("numTotalEntries"),
      ])
      .executeTakeFirst();

    const datasets = await getDownstreamDatasets({
      monitorFilterNodeId: monitor.config.filterNodeId,
    })
      .distinctOn(["datasetNode.id"])
      .selectAll("d")
      .select((eb) => [
        "datasetNode.config as nodeConfig",
        "llmRelabelNode.id as llmRelabelNodeId",
        "llmRelabelNode.config as llmRelabelNodeConfig",
        jsonObjectFrom(
          eb
            .selectFrom("DataChannel as dc")
            .whereRef("dc.destinationId", "=", "llmRelabelNode.id")
            .innerJoin("NodeEntry as ne", "ne.dataChannelId", "dc.id")
            .select([
              sql<number>`count(case when ne.status = ${NodeEntryStatus.PROCESSED} then 1 end)::int`.as(
                "numRelabeledEntries",
              ),
              sql<number>`count(case when ne.status = ${NodeEntryStatus.ERROR} then 1 end)::int`.as(
                "numErroredEntries",
              ),
              sql<number>`count(case when ne.status != ${NodeEntryStatus.PROCESSED} and ne.status != ${NodeEntryStatus.ERROR} then 1 end)::int`.as(
                "numUnrelabeledEntries",
              ),
            ]),
        ).as("entryCounts"),
      ])
      .distinctOn(["dc0.createdAt"])
      .orderBy("dc0.createdAt", "asc")
      .execute()
      .then((datasets) =>
        datasets.map((dataset) => ({
          ...dataset,
          numRelabeledEntries: dataset.entryCounts?.numRelabeledEntries ?? 0,
          numErroredEntries: dataset.entryCounts?.numErroredEntries ?? 0,
          numUnrelabeledEntries: dataset.entryCounts?.numUnrelabeledEntries ?? 0,
          node: typedNode({ config: dataset.nodeConfig, type: "Dataset" }),
          llmRelabelNode: typedNode({
            id: dataset.llmRelabelNodeId,
            config: dataset.llmRelabelNodeConfig,
            type: "LLMRelabel",
          }),
        })),
      );

    return {
      ...monitor,
      filter: {
        ...filter,
        numFilteredEntries: filter.config.skipped
          ? filteredEntryStats?.numProcessedEntries ?? 0
          : filteredEntryStats?.numMatchedEntries ?? 0,
        numProcessedEntries: filteredEntryStats?.numProcessedEntries ?? 0,
        numTotalEntries: filteredEntryStats?.numTotalEntries ?? 0,
      },
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
          getDownstreamDatasets({ monitorFilterNodeId: monitor.config.filterNodeId })
            .groupBy("monitorFilterNode.id")
            .select([
              "monitorFilterNode.id as filterId",
              sql<number>`count(distinct "datasetNode".id)::int`.as("count"),
            ])
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
          skipFilter: z.boolean().optional(),
          judgementCriteria: judgementCriteria.optional(),
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
          skipFilter,
          judgementCriteria,
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
        .innerJoin("NodeOutput as matchNodeOutput", (join) =>
          join
            .onRef("matchNodeOutput.nodeId", "=", "n.id")
            .on("matchNodeOutput.label", "=", FilterOutput.Match),
        )
        .selectAll("n")
        .select(["matchNodeOutput.id as matchNodeOutputId"])
        .executeTakeFirst()
        .then((filter) => (filter ? typedNode({ ...filter, type: "Filter" }) : undefined));

      if (!filter) throw new TRPCError({ code: "NOT_FOUND" });

      let reprocessingRequired = false;

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
      if (hashUpdated) reprocessingRequired = true;
      const monitorInvalidated = hashUpdated && !preserveCache;

      const updatedMonitor = await prisma.node
        .update({
          where: { id },
          data: checkNodeInput(updatedMonitorData),
        })
        .then((monitor) => typedNode({ ...monitor, type: "Monitor" }));

      const { hash: updatedFilterHash } = await prisma.node.update({
        where: { id: monitor.config.filterNodeId },
        data: checkNodeInput({
          id: monitor.config.filterNodeId,
          projectId: monitor.projectId,
          type: "Filter",
          config: {
            ...filter.config,
            mode: "LLM",
            skipped: skipFilter ?? filter.config.skipped,
            judgementCriteria: judgementCriteria ?? filter.config.judgementCriteria,
          },
        }),
      });

      const filterInvalidated = updatedFilterHash !== filter.hash;

      if (filterInvalidated) {
        reprocessingRequired = true;
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

      if (datasetManualRelabelNodeIds) {
        reprocessingRequired = true;
        const existingConnections = await getDownstreamDatasets({
          monitorFilterNodeId: filter.id,
        })
          .select([
            "llmRelabelNode.id as llmRelabelNodeId",
            "manualRelabelNode.id as manualRelabelNodeId",
          ])
          .execute();

        const manualRelabelNodeIdsToConnect = datasetManualRelabelNodeIds.filter(
          (id) => !existingConnections.some((c) => c.manualRelabelNodeId === id),
        );

        const prismaCreations: Prisma.PrismaPromise<unknown>[] = [];

        for (const manualRelabelNodeId of manualRelabelNodeIdsToConnect) {
          prismaCreations.push(
            ...prepareMonitorDatasetRelabelNode({
              projectId: monitor.projectId,
              monitorFilterMatchOutputId: filter.matchNodeOutputId,
              datasetManualRelabelNodeId: manualRelabelNodeId,
            }).prismaCreations,
          );
        }

        await prisma.$transaction(prismaCreations);

        const connectionsToDelete = existingConnections.filter(
          (c) => !datasetManualRelabelNodeIds.includes(c.manualRelabelNodeId),
        );
        // deleting the llm relabel node disconnects the monitor and dataset
        if (connectionsToDelete.length) {
          await kysely
            .deleteFrom("Node")
            .where(
              "id",
              "in",
              connectionsToDelete.map((c) => c.llmRelabelNodeId),
            )
            .execute();
        }
      }

      const monitorInitialized = !!updatedMonitor.config.initialFilters.length;
      if (reprocessingRequired && monitorInitialized)
        await enqueueProcessNode({ nodeId: id, invalidateData: monitorInvalidated });

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

      const llmRelabelNodes = await getDownstreamDatasets({
        monitorFilterNodeId: tMonitor.config.filterNodeId,
      })
        .select(["llmRelabelNode.id"])
        .execute();

      await prisma.$transaction([
        ...llmRelabelNodes.map((node) => prisma.node.delete({ where: { id: node.id } })),
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
