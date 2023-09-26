import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { prisma } from "~/server/db";
import { updatePruningRuleMatches } from "~/server/utils/updatePruningRuleMatches";
import {
  requireCanModifyProject,
  requireCanViewProject,
  requireCanModifyPruningRule,
} from "~/utils/accessControl";
import { countLlamaChatTokens } from "~/utils/countTokens";

export const pruningRulesRouter = createTRPCRouter({
  list: protectedProcedure
    .input(z.object({ datasetId: z.string() }))
    .query(async ({ input, ctx }) => {
      const dataset = await prisma.dataset.findUnique({
        where: {
          id: input.datasetId,
        },
        include: {
          pruningRules: {
            orderBy: [{ createdAt: "asc" }, { id: "asc" }],
            select: {
              id: true,
              textToMatch: true,
              tokensInText: true,
              _count: {
                select: {
                  matches: true,
                },
              },
            },
          },
        },
      });
      if (!dataset) throw new TRPCError({ code: "NOT_FOUND" });
      const { projectId, pruningRules } = dataset;
      await requireCanViewProject(projectId, ctx);

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
          tokensInText: countLlamaChatTokens(input.updates.textToMatch),
        },
      });

      if (!datasetId) return;

      await updatePruningRuleMatches(datasetId, createdAt);
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
          tokensInText: countLlamaChatTokens(input.textToMatch),
          datasetId: input.datasetId,
        },
      });

      if (!datasetId) return;

      await updatePruningRuleMatches(datasetId, createdAt);
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

      await updatePruningRuleMatches(datasetId, createdAt);
    }),
});
