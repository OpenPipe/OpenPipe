import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
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
            model: "gpt-3.5-turbo-0613",
            messages: [
              {
                role: "system",
                content: "Return 'Ready to go!'",
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

  update: publicProcedure
    .input(z.object({ id: z.string(), updates: z.object({ label: z.string() }) }))
    .mutation(async ({ input }) => {
      return await prisma.experiment.update({
        where: {
          id: input.id,
        },
        data: {
          label: input.updates.label,
        },
      });
    }),

  delete: publicProcedure.input(z.object({ id: z.string() })).mutation(async ({ input }) => {
    await prisma.experiment.delete({
      where: {
        id: input.id,
      },
    });

    // Return the ID of the newest existing experiment so the client can redirect to it
    const newestExperiment = await prisma.experiment.findFirst({
      orderBy: {
        sortIndex: "desc",
      },
    });

    return newestExperiment?.id;
  }),
});
