import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { prisma } from "~/server/db";
import dedent from "dedent";
import { generateNewCell } from "~/server/utils/generateNewCell";

export const experimentsRouter = createTRPCRouter({
  list: publicProcedure.query(async () => {
    const experiments = await prisma.experiment.findMany({
      orderBy: {
        sortIndex: "asc",
      },
    });

    // TODO: look for cleaner way to do this. Maybe aggregate?
    const experimentsWithCounts = await Promise.all(
      experiments.map(async (experiment) => {
        const visibleTestScenarioCount = await prisma.testScenario.count({
          where: {
            experimentId: experiment.id,
            visible: true,
          },
        });

        const visiblePromptVariantCount = await prisma.promptVariant.count({
          where: {
            experimentId: experiment.id,
            visible: true,
          },
        });

        return {
          ...experiment,
          testScenarioCount: visibleTestScenarioCount,
          promptVariantCount: visiblePromptVariantCount,
        };
      }),
    );

    return experimentsWithCounts;
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

    const [variant, scenario] = await prisma.$transaction([
      prisma.promptVariant.create({
        data: {
          experimentId: exp.id,
          label: "Prompt Variant 1",
          sortIndex: 0,
          constructFn: dedent`prompt = {
            model: "gpt-3.5-turbo-0613",
            stream: true,
            messages: [{ role: "system", content: "Return 'Ready to go!'" }],
          }`,
          model: "gpt-3.5-turbo-0613",
        },
      }),
      prisma.testScenario.create({
        data: {
          experimentId: exp.id,
          variableValues: {},
        },
      }),
    ]);

    await generateNewCell(variant.id, scenario.id);

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
  }),
});
