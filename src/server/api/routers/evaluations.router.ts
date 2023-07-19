import { EvalType } from "@prisma/client";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "~/server/api/trpc";
import { prisma } from "~/server/db";
import { runAllEvals } from "~/server/utils/evaluations";
import { requireCanModifyExperiment, requireCanViewExperiment } from "~/utils/accessControl";

export const evaluationsRouter = createTRPCRouter({
  list: publicProcedure
    .input(z.object({ experimentId: z.string() }))
    .query(async ({ input, ctx }) => {
      await requireCanViewExperiment(input.experimentId, ctx);

      return await prisma.evaluation.findMany({
        where: {
          experimentId: input.experimentId,
        },
        orderBy: { createdAt: "asc" },
      });
    }),

  create: protectedProcedure
    .input(
      z.object({
        experimentId: z.string(),
        label: z.string(),
        value: z.string(),
        evalType: z.nativeEnum(EvalType),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      await requireCanModifyExperiment(input.experimentId, ctx);

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

  update: protectedProcedure
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
    .mutation(async ({ input, ctx }) => {
      const { experimentId } = await prisma.evaluation.findUniqueOrThrow({
        where: { id: input.id },
      });
      await requireCanModifyExperiment(experimentId, ctx);

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

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const { experimentId } = await prisma.evaluation.findUniqueOrThrow({
        where: { id: input.id },
      });
      await requireCanModifyExperiment(experimentId, ctx);

      await prisma.evaluation.delete({
        where: { id: input.id },
      });
    }),
});
