import { z } from "zod";
import { sql } from "kysely";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { kysely, prisma } from "~/server/db";
import { requireCanViewProject } from "~/utils/accessControl";
import { TRPCError } from "@trpc/server";
import { relabelOptions, typedNode } from "~/server/utils/nodes/node.types";
import { error, success } from "~/utils/errorHandling/standardResponses";
import { requireCanModifyProject } from "~/utils/accessControl";
import { enqueueProcessNode } from "~/server/tasks/nodes/processNodes/processNode.task";
import { checkNodeInput } from "~/server/utils/nodes/checkNodeInput";

export const nodesRouter = createTRPCRouter({
  list: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ input, ctx }) => {
      await requireCanViewProject(input.projectId, ctx);
      const nodes = await kysely
        .selectFrom("Node as n")
        .where("n.projectId", "=", input.projectId)
        .innerJoin("DataChannel as dc", "dc.destinationId", "n.id")
        .selectAll("n")
        .select((eb) => [
          eb
            .selectFrom("NodeEntry as ne")
            .whereRef("ne.dataChannelId", "=", "dc.id")
            .where("ne.status", "=", "PENDING")
            .select(sql<number>`count(*)::int`.as("count"))
            .as("numPendingEntries"),
          eb
            .selectFrom("NodeEntry as ne")
            .whereRef("ne.dataChannelId", "=", "dc.id")
            .where("ne.status", "=", "PROCESSING")
            .select(sql<number>`count(*)::int`.as("count"))
            .as("numProcessingEntries"),
          eb
            .selectFrom("NodeEntry as ne")
            .whereRef("ne.dataChannelId", "=", "dc.id")
            .where("ne.status", "=", "ERROR")
            .select(sql<number>`count(*)::int`.as("count"))
            .as("numErrorEntries"),

          eb
            .selectFrom("NodeEntry as ne")
            .whereRef("ne.dataChannelId", "=", "dc.id")
            .where("ne.status", "=", "PROCESSED")
            .select(sql<number>`count(*)::int`.as("count"))
            .as("numProcessedEntries"),
        ])
        .orderBy("n.createdAt", "desc")
        .execute();
      return nodes;
    }),
  get: protectedProcedure.input(z.object({ id: z.string() })).query(async ({ input, ctx }) => {
    const node = await kysely
      .selectFrom("Node as n")
      .where("n.id", "=", input.id)
      .selectAll("n")
      .executeTakeFirst();

    if (!node) throw new TRPCError({ code: "NOT_FOUND" });

    const tNode = typedNode(node);

    await requireCanViewProject(tNode.projectId, ctx);

    return tNode;
  }),
  updateRelabelingModel: protectedProcedure
    .input(
      z.object({
        llmRelabelNodeId: z.string(),
        relabelOption: z.enum(relabelOptions),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const llmRelabelNode = await kysely
        .selectFrom("Node as n")
        .where("n.id", "=", input.llmRelabelNodeId)
        .selectAll("n")
        .executeTakeFirst();

      if (!llmRelabelNode) return error("Relabeling model not found");

      await requireCanModifyProject(llmRelabelNode.projectId, ctx);

      const tLlmRelabelNode = typedNode({ ...llmRelabelNode, type: "LLMRelabel" });

      if (tLlmRelabelNode.config.relabelLLM === input.relabelOption)
        return success("Archive relabeling model already set to this option");

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
        invalidateData: true,
      });

      return success("Archive relabeling model updated");
    }),
});
