import { z } from "zod";
import { createTRPCRouter, publicProcedure, protectedProcedure } from "~/server/api/trpc";
import { prisma } from "~/server/db";

export const experimentsRouter = createTRPCRouter({
  list: publicProcedure.query(async () => {
    return await prisma.experiment.findMany({
      orderBy: {
        sortIndex: "asc",
      },
    });
  }),

  get: publicProcedure.input(z.object({ id: z.string() })).query(async ({ input }) => {
    return await prisma.experiment.findFirst({
      where: {
        id: input.id,
      },
    });
  }),

  create: publicProcedure.input(z.object({})).mutation(async () => {
    const maxSortIndex =
      (
        await prisma.experiment.aggregate({
          _max: {
            sortIndex: true,
          },
        })
      )._max?.sortIndex ?? 0;

    const exp = await prisma.experiment.create({
      data: {
        sortIndex: maxSortIndex + 1,
        label: `Experiment ${maxSortIndex + 1}`,
      },
    });

    await prisma.$transaction([
      prisma.promptVariant.create({
        data: {
          experimentId: exp.id,
          label: "Prompt Variant 1",
          sortIndex: 0,
          config: {
            model: "gpt-3.5-turbo",
            messages: [
              {
                role: "system",
                content: "count to three in Spanish...",
              },
            ],
          },
        },
      }),
      prisma.testScenario.create({
        data: {
          experimentId: exp.id,
          variableValues: {},
        },
      }),
    ]);

    return exp;
  }),
});
