import { EvalType } from "@prisma/client";
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
        label: z.string(),
        value: z.string(),
        evalType: z.nativeEnum(EvalType),
      }),
    )
    .mutation(async ({ input }) => {
      const evaluation = await prisma.evaluation.create({
        data: {
          experimentId: input.experimentId,
          label: input.label,
          value: input.value,
          evalType: input.evalType,
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
          value: z.string().optional(),
          evalType: z.nativeEnum(EvalType).optional(),
        }),
      }),
    )
    .mutation(async ({ input }) => {
      await prisma.evaluation.update({
        where: { id: input.id },
        data: {
          label: input.updates.name,
          value: input.updates.value,
          evalType: input.updates.evalType,
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
