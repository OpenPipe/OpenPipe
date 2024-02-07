import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { kysely, prisma } from "~/server/db";
import { updateDatasetPruningRuleMatches } from "~/server/utils/nodes/processNodes/updatePruningRuleMatches";
import {
  requireCanModifyProject,
  requireCanViewProject,
  requireCanModifyPruningRule,
} from "~/utils/accessControl";
import { countLlamaTokens } from "~/utils/countTokens";

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
        .leftJoin("PruningRule as pr", "pr.datasetId", "d.id")
        .leftJoin("PruningRuleMatch as prm", "prm.pruningRuleId", "pr.id")
        .leftJoin("NodeData as nd", (join) =>
          join
            .onRef("nd.nodeId", "=", "d.nodeId")
            .onRef("nd.inputHash", "=", "prm.inputHash")
            .on("nd.status", "=", "PROCESSED"),
        )
        .selectAll("pr")
        .select((eb) => ["projectId", eb.fn.count<number>("nd.id").as("numMatches")])
        .groupBy("pr.id")
        .orderBy("pr.createdAt", "asc")
        .execute();

      return pruningRules;
    }),
  update: protectedProcedure
    .input(z.object({ id: z.string(), updates: z.object({ textToMatch: z.string() }) }))
    .mutation(async ({ input, ctx }) => {
      await requireCanModifyPruningRule(input.id, ctx);

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

      await updateDatasetPruningRuleMatches(datasetId, createdAt);
    }),
  create: protectedProcedure
    .input(z.object({ datasetId: z.string(), textToMatch: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const dataset = await prisma.dataset.findUnique({
        where: {
          id: input.datasetId,
        },
      });
      if (!dataset) throw new TRPCError({ code: "NOT_FOUND" });
      await requireCanModifyProject(dataset.projectId, ctx);

      const { datasetId, createdAt } = await prisma.pruningRule.create({
        data: {
          textToMatch: input.textToMatch,
          tokensInText: countLlamaTokens(input.textToMatch),
          datasetId: input.datasetId,
        },
      });

      if (!datasetId) return;

      await updateDatasetPruningRuleMatches(datasetId, createdAt);
    }),
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      await requireCanModifyPruningRule(input.id, ctx);

      const { datasetId, createdAt } = await prisma.pruningRule.delete({
        where: {
          id: input.id,
        },
      });

      if (!datasetId) return;

      await updateDatasetPruningRuleMatches(datasetId, createdAt);
    }),
});
