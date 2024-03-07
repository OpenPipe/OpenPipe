import { z } from "zod";
import { sql } from "kysely";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { kysely } from "~/server/db";
import { requireCanViewProject } from "~/utils/accessControl";
import { TRPCError } from "@trpc/server";
import { typedNode } from "~/server/utils/nodes/node.types";

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
});
