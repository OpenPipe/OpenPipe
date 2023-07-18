import { EvalType } from "@prisma/client";
import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { prisma } from "~/server/db";
import { runAllEvals } from "~/server/utils/evaluations";

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
      await prisma.evaluation.create({
        data: {
          experimentId: input.experimentId,
          label: input.label,
          value: input.value,
          evalType: input.evalType,
        },
      });

      // TODO: this may be a bad UX for slow evals (eg. GPT-4 evals) Maybe need
      // to kick off a background job or something instead
      await runAllEvals(input.experimentId);
    }),

  update: publicProcedure
    .input(
      z.object({
        id: z.string(),
        updates: z.object({
          label: z.string().optional(),
          value: z.string().optional(),
          evalType: z.nativeEnum(EvalType).optional(),
        }),
      }),
    )
    .mutation(async ({ input }) => {
      const evaluation = await prisma.evaluation.update({
        where: { id: input.id },
        data: {
          label: input.updates.label,
          value: input.updates.value,
          evalType: input.updates.evalType,
        },
      });

      await prisma.outputEvaluation.deleteMany({
        where: {
          evaluationId: evaluation.id,
        },
      });
      // Re-run all evals. Other eval results will already be cached, so this
      // should only re-run the updated one.
      await runAllEvals(evaluation.experimentId);
    }),

  delete: publicProcedure.input(z.object({ id: z.string() })).mutation(async ({ input }) => {
    await prisma.evaluation.delete({
      where: { id: input.id },
    });
  }),
});
