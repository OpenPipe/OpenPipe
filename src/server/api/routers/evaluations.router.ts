import { EvaluationMatchType } from "@prisma/client";
import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { prisma } from "~/server/db";
import { reevaluateEvaluation } from "~/server/utils/evaluations";

export const evaluationsRouter = createTRPCRouter({
  list: publicProcedure.input(z.object({ experimentId: z.string() })).query(async ({ input }) => {
    return await prisma.evaluation.findMany({
      where: {
        experimentId: input.experimentId,
      },
      orderBy: { createdAt: "asc" },
    });
  }),

  create: publicProcedure
    .input(
      z.object({
        experimentId: z.string(),
        name: z.string(),
        matchString: z.string(),
        matchType: z.nativeEnum(EvaluationMatchType),
      }),
    )
    .mutation(async ({ input }) => {
      const evaluation = await prisma.evaluation.create({
        data: {
          experimentId: input.experimentId,
          name: input.name,
          matchString: input.matchString,
          matchType: input.matchType,
        },
      });
      await reevaluateEvaluation(evaluation);
    }),

  update: publicProcedure
    .input(
      z.object({
        id: z.string(),
        updates: z.object({
          name: z.string().optional(),
          matchString: z.string().optional(),
          matchType: z.nativeEnum(EvaluationMatchType).optional(),
        }),
      }),
    )
    .mutation(async ({ input }) => {
      await prisma.evaluation.update({
        where: { id: input.id },
        data: {
          name: input.updates.name,
          matchString: input.updates.matchString,
          matchType: input.updates.matchType,
        },
      });
      await reevaluateEvaluation(
        await prisma.evaluation.findUniqueOrThrow({ where: { id: input.id } }),
      );
    }),

  delete: publicProcedure.input(z.object({ id: z.string() })).mutation(async ({ input }) => {
    await prisma.evaluation.delete({
      where: { id: input.id },
    });
  }),
});
