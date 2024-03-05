import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import { sql } from "kysely";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { kysely, prisma } from "~/server/db";
import { requireCanModifyProject, requireCanViewProject } from "~/utils/accessControl";
import { TRPCError } from "@trpc/server";
import { filtersSchema } from "~/types/shared.types";
import { typedNode } from "~/server/utils/nodes/node.types";
import { success } from "~/utils/errorHandling/standardResponses";
import { getDownstreamDatasets } from "~/server/utils/nodes/relationalQueries";
import { checkNodeInput } from "~/server/utils/nodes/checkNodeInput";
import { enqueueProcessNode } from "~/server/tasks/nodes/processNodes/processNode.task";
import { prepareIntegratedMonitorCeation } from "~/server/utils/nodes/nodeCreation/prepareIntegratedNodesCreation";
import { convertCache } from "~/server/utils/nodes/convertCache";
import { invalidateNodeEntries } from "~/server/tasks/nodes/processNodes/invalidateNodeEntries";
import { FilterOutput } from "~/server/utils/nodes/nodeProperties/filterProperties";

export const monitorsRouter = createTRPCRouter({
  get: protectedProcedure.input(z.object({ id: z.string() })).query(async ({ input, ctx }) => {
    const monitor = await kysely
      .selectFrom("Node as n")
      .where("n.id", "=", input.id)
      .where("n.type", "=", "Monitor")
      .selectAll("n")
      .executeTakeFirst();

    if (!monitor) throw new TRPCError({ code: "NOT_FOUND" });

    const tMonitor = typedNode({ ...monitor, type: "Monitor" });

    await requireCanViewProject(monitor.projectId, ctx);

    const datasets = await getDownstreamDatasets({
      monitorFilterNodeId: tMonitor.config.filterNodeId,
    })
      .select(["datasetNode.id as datasetNodeId", "d.id as datasetId", "d.name as datasetName"])
      .execute();

    return { ...tMonitor, datasets };
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
            .groupBy(["filterNode.id", "datasetNode.id"])
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

        .selectAll("n")
        .executeTakeFirst();

      if (!monitor) throw new TRPCError({ code: "NOT_FOUND" });

      const tMonitor = typedNode({ ...monitor, type: "Monitor" });

      if (tMonitor.type !== "Monitor") throw new TRPCError({ code: "BAD_REQUEST" });

      const filter = await kysely
        .selectFrom("Node as n")
        .where("n.id", "=", tMonitor.config.filterNodeId)
        .innerJoin("NodeOutput as no", "no.nodeId", "n.id")
        .where("no.label", "=", FilterOutput.Passed)
        .selectAll("n")
        .select(["no.id as passedFilterOutputId"])
        .executeTakeFirst();

      if (!filter) throw new TRPCError({ code: "NOT_FOUND" });

      const tFilter = typedNode({ ...filter, type: "Filter" });

      await requireCanModifyProject(tMonitor.projectId, ctx);

      const initialMonitorHash = tMonitor.hash;

      const { hash: updatedMonitorHash } = await prisma.node.update({
        where: { id },
        data: checkNodeInput({
          id,
          projectId: monitor.projectId,
          name,
          type: "Monitor",
          config: {
            ...tMonitor.config,
            initialFilters: initialFilters ?? tMonitor.config.initialFilters,
          },
        }),
      });

      const invalidateMonitor = initialMonitorHash !== updatedMonitorHash && !preserveCache;

      if (invalidateMonitor) {
        await prisma.node.update({
          where: { id },
          data: checkNodeInput({
            id,
            projectId: monitor.projectId,
            type: "Monitor",
            config: {
              ...tMonitor.config,
              lastLoggedCallUpdatedAt: new Date(0),
            },
          }),
        });
      }

      const { hash: updatedFilterHash } = await prisma.node.update({
        where: { id: tMonitor.config.filterNodeId },
        data: checkNodeInput({
          id,
          projectId: monitor.projectId,
          type: "Filter",
          config: {
            ...tFilter.config,
            filters: checkFilters ?? tFilter.config.filters,
          },
        }),
      });

      const filterChecksUpdated = updatedFilterHash !== tFilter.hash;

      if (filterChecksUpdated) {
        if (preserveCache) {
          await convertCache({
            nodeHash: tFilter.hash,
            nodeId: tFilter.id,
          });
        } else {
          await invalidateNodeEntries(tFilter.id);
        }
      }

      if (datasetLLMRelabelNodeIds) {
        const existingDatasetLLMRelabelNodeIds = await getDownstreamDatasets({
          monitorFilterNodeId: tFilter.id,
        })
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
              originId: tFilter.passedFilterOutputId,
              destinationId: llmRelabelNodeId,
              updatedAt: new Date(),
            })),
          )
          .execute();

        const datasetNodeIdsToDisconnect = existingDatasetLLMRelabelNodeIds.filter(
          (id) => !datasetLLMRelabelNodeIds.includes(id),
        );

        await kysely
          .deleteFrom("DataChannel")
          .where("originId", "=", tFilter.passedFilterOutputId)
          .where("destinationId", "in", datasetNodeIdsToDisconnect)
          .execute();
      }

      await enqueueProcessNode({
        nodeId: id,
        invalidateData: invalidateMonitor,
      });

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
          where: { id: tMonitor.config.filterNodeId },
        }),
        prisma.node.delete({
          where: { id: input.id },
        }),
      ]);

      return success("Monitor deleted");
    }),
});
