import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { kysely, prisma } from "~/server/db";
import { updateDatasetPruningRuleMatches } from "~/server/utils/nodes/updatePruningRuleMatches";
import { requireCanModifyProject, requireCanViewProject } from "~/utils/accessControl";
import { countLlamaTokens } from "~/utils/countTokens";
import { error } from "~/utils/errorHandling/standardResponses";

export const pruningRulesRouter = createTRPCRouter({
  list: protectedProcedure
    .input(z.object({ datasetId: z.string() }))
    .query(async ({ input, ctx }) => {
      const dataset = await prisma.dataset.findUnique({
        where: {
          id: input.datasetId,
        },
      });
      if (!dataset) throw new TRPCError({ code: "NOT_FOUND" });
      const { projectId } = dataset;
      await requireCanViewProject(projectId, ctx);

      const pruningRules = await kysely
        .selectFrom("Dataset as d")
        .where("d.id", "=", input.datasetId)
        .innerJoin("PruningRule as pr", "pr.datasetId", "d.id")
        .leftJoin("PruningRuleMatch as prm", "prm.pruningRuleId", "pr.id")
        .innerJoin("DataChannel as dc", "dc.destinationId", "d.nodeId")
        .leftJoin("NodeEntry as ne", (join) =>
          join
            .onRef("ne.dataChannelId", "=", "dc.id")
            .onRef("ne.inputHash", "=", "prm.inputHash")
            .on("ne.status", "=", "PROCESSED"),
        )
        .selectAll("pr")
        .select((eb) => ["d.projectId", eb.fn.count<number>("ne.id").as("numMatches")])
        .groupBy(["d.projectId", "pr.id"])
        .orderBy("pr.createdAt", "asc")
        .execute();

      return pruningRules;
    }),
  update: protectedProcedure
    .input(z.object({ id: z.string(), updates: z.object({ textToMatch: z.string() }) }))
    .mutation(async ({ input, ctx }) => {
      const datasetNode = await kysely
        .selectFrom("PruningRule as pr")
        .where("pr.id", "=", input.id)
        .innerJoin("Dataset as d", "d.id", "pr.datasetId")
        .innerJoin("Node as n", "n.id", "d.nodeId")
        .selectAll("n")
        .select("d.id as datasetId")
        .executeTakeFirst();

      if (!datasetNode) return error("Dataset node not found");

      await requireCanModifyProject(datasetNode.projectId, ctx);

      const { datasetId, createdAt } = await prisma.pruningRule.update({
        where: {
          id: input.id,
        },
        data: {
          textToMatch: input.updates.textToMatch,
          tokensInText: countLlamaTokens(input.updates.textToMatch),
        },
      });

      if (!datasetId) return;

      await updateDatasetPruningRuleMatches({
        nodeHash: datasetNode.hash,
        datasetId: datasetNode.datasetId,
        nodeEntryBaseQuery: kysely
          .selectFrom("NodeEntry as ne")
          .innerJoin("DataChannel as dc", (join) =>
            join
              .onRef("dc.id", "=", "ne.dataChannelId")
              .on("dc.destinationId", "=", datasetNode.id),
          )
          .where("ne.status", "=", "PROCESSED"),
        pruningRuleCutoffDate: createdAt,
        deleteMatches: true,
      });
    }),
  create: protectedProcedure
    .input(z.object({ datasetId: z.string(), textToMatch: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const datasetNode = await kysely
        .selectFrom("Dataset as d")
        .where("d.id", "=", input.datasetId)
        .innerJoin("Node as n", "n.id", "d.nodeId")
        .selectAll("n")
        .select("d.id as datasetId")
        .executeTakeFirst();

      if (!datasetNode) return error("Dataset node not found");

      await requireCanModifyProject(datasetNode.projectId, ctx);

      const { datasetId, createdAt } = await prisma.pruningRule.create({
        data: {
          textToMatch: input.textToMatch,
          tokensInText: countLlamaTokens(input.textToMatch),
          datasetId: input.datasetId,
        },
      });

      if (!datasetId) return;

      await updateDatasetPruningRuleMatches({
        nodeHash: datasetNode.hash,
        datasetId: datasetNode.datasetId,
        nodeEntryBaseQuery: kysely
          .selectFrom("NodeEntry as ne")
          .innerJoin("DataChannel as dc", (join) =>
            join
              .onRef("dc.id", "=", "ne.dataChannelId")
              .on("dc.destinationId", "=", datasetNode.id),
          )
          .where("ne.status", "=", "PROCESSED"),
        pruningRuleCutoffDate: createdAt,
        deleteMatches: true,
      });
    }),
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const datasetNode = await kysely
        .selectFrom("PruningRule as pr")
        .where("pr.id", "=", input.id)
        .innerJoin("Dataset as d", "d.id", "pr.datasetId")
        .innerJoin("Node as n", "n.id", "d.nodeId")
        .selectAll("n")
        .select("d.id as datasetId")
        .executeTakeFirst();

      if (!datasetNode) return error("Dataset node not found");

      await requireCanModifyProject(datasetNode.projectId, ctx);

      const { datasetId, createdAt } = await prisma.pruningRule.delete({
        where: {
          id: input.id,
        },
      });

      if (!datasetId) return;

      await updateDatasetPruningRuleMatches({
        nodeHash: datasetNode.hash,
        datasetId: datasetNode.datasetId,
        nodeEntryBaseQuery: kysely
          .selectFrom("NodeEntry as ne")
          .innerJoin("DataChannel as dc", (join) =>
            join
              .onRef("dc.id", "=", "ne.dataChannelId")
              .on("dc.destinationId", "=", datasetNode.id),
          )
          .where("ne.status", "=", "PROCESSED"),
        pruningRuleCutoffDate: createdAt,
        deleteMatches: true,
      });
    }),
});
