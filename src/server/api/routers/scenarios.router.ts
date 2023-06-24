import { z } from "zod";
import { createTRPCRouter, publicProcedure, protectedProcedure } from "~/server/api/trpc";
import { prisma } from "~/server/db";

export const scenariosRouter = createTRPCRouter({
  list: publicProcedure.input(z.object({ experimentId: z.string() })).query(async ({ input }) => {
    return await prisma.testScenario.findMany({
      where: {
        experimentId: input.experimentId,
        visible: true,
      },
      orderBy: {
        sortIndex: "asc",
      },
    });
  }),

  create: publicProcedure
    .input(
      z.object({
        experimentId: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const maxSortIndex =
        (
          await prisma.testScenario.aggregate({
            where: {
              experimentId: input.experimentId,
            },
            _max: {
              sortIndex: true,
            },
          })
        )._max.sortIndex ?? 0;

      const newScenario = await prisma.testScenario.create({
        data: {
          experimentId: input.experimentId,
          sortIndex: maxSortIndex + 1,
          variableValues: {},
        },
      });
    }),

  replaceWithValues: publicProcedure
    .input(
      z.object({
        id: z.string(),
        values: z.record(z.string()),
      })
    )
    .mutation(async ({ input }) => {
      const existing = await prisma.testScenario.findUnique({
        where: {
          id: input.id,
        },
      });

      if (!existing) {
        throw new Error(`Scenario with id ${input.id} does not exist`);
      }

      const newScenario = await prisma.testScenario.create({
        data: {
          experimentId: existing.experimentId,
          sortIndex: existing.sortIndex,
          variableValues: input.values,
          uiId: existing.uiId,
        },
      });

      // Hide the old scenario
      await prisma.testScenario.updateMany({
        where: {
          uiId: existing.uiId,
          id: {
            not: newScenario.id,
          },
        },
        data: {
          visible: false,
        },
      });

      return newScenario;
    }),
});
