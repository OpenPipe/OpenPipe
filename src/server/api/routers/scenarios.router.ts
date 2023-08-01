import { z } from "zod";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "~/server/api/trpc";
import { prisma } from "~/server/db";
import { autogenerateScenarioValues } from "../autogen";
import { recordExperimentUpdated } from "~/server/utils/recordExperimentUpdated";
import { runAllEvals } from "~/server/utils/evaluations";
import { generateNewCell } from "~/server/utils/generateNewCell";
import { requireCanModifyExperiment, requireCanViewExperiment } from "~/utils/accessControl";

const PAGE_SIZE = 10;

export const scenariosRouter = createTRPCRouter({
  list: publicProcedure
    .input(z.object({ experimentId: z.string(), page: z.number() }))
    .query(async ({ input, ctx }) => {
      await requireCanViewExperiment(input.experimentId, ctx);

      const { experimentId, page } = input;

      const scenarios = await prisma.testScenario.findMany({
        where: {
          experimentId,
          visible: true,
        },
        orderBy: { sortIndex: "asc" },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
      });

      const count = await prisma.testScenario.count({
        where: {
          experimentId,
          visible: true,
        },
      });

      return {
        scenarios,
        startIndex: (page - 1) * PAGE_SIZE + 1,
        lastPage: Math.ceil(count / PAGE_SIZE),
        count,
      };
    }),
  get: protectedProcedure.input(z.object({ id: z.string() })).query(async ({ input, ctx }) => {
    const scenario = await prisma.testScenario.findUnique({
      where: {
        id: input.id,
      },
    });

    if (!scenario) {
      throw new Error(`Scenario with id ${input.id} does not exist`);
    }

    await requireCanViewExperiment(scenario.experimentId, ctx);

    return scenario;
  }),
  create: protectedProcedure
    .input(
      z.object({
        experimentId: z.string(),
        autogenerate: z.boolean().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      await requireCanModifyExperiment(input.experimentId, ctx);

      await prisma.testScenario.updateMany({
        where: {
          experimentId: input.experimentId,
        },
        data: {
          sortIndex: {
            increment: 1,
          },
        },
      });

      const createNewScenarioAction = prisma.testScenario.create({
        data: {
          experimentId: input.experimentId,
          sortIndex: 0,
          variableValues: input.autogenerate
            ? await autogenerateScenarioValues(input.experimentId)
            : {},
        },
      });

      const [scenario] = await prisma.$transaction([
        createNewScenarioAction,
        recordExperimentUpdated(input.experimentId),
      ]);

      const promptVariants = await prisma.promptVariant.findMany({
        where: {
          experimentId: input.experimentId,
          visible: true,
        },
      });

      for (const variant of promptVariants) {
        await generateNewCell(variant.id, scenario.id, { stream: true });
      }
    }),

  hide: protectedProcedure.input(z.object({ id: z.string() })).mutation(async ({ input, ctx }) => {
    const experimentId = (
      await prisma.testScenario.findUniqueOrThrow({
        where: { id: input.id },
      })
    ).experimentId;

    await requireCanModifyExperiment(experimentId, ctx);
    const hiddenScenario = await prisma.testScenario.update({
      where: { id: input.id },
      data: { visible: false, experiment: { update: { updatedAt: new Date() } } },
    });

    // Reevaluate all evaluations now that this scenario is hidden
    await runAllEvals(hiddenScenario.experimentId);

    return hiddenScenario;
  }),

  reorder: protectedProcedure
    .input(
      z.object({
        draggedId: z.string(),
        droppedId: z.string(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const dragged = await prisma.testScenario.findUnique({
        where: {
          id: input.draggedId,
        },
      });

      const dropped = await prisma.testScenario.findUnique({
        where: {
          id: input.droppedId,
        },
      });

      if (!dragged || !dropped || dragged.experimentId !== dropped.experimentId) {
        throw new Error(
          `Prompt Variant with id ${input.draggedId} or ${input.droppedId} does not exist`,
        );
      }

      await requireCanModifyExperiment(dragged.experimentId, ctx);

      const visibleItems = await prisma.testScenario.findMany({
        where: {
          experimentId: dragged.experimentId,
          visible: true,
        },
        orderBy: {
          sortIndex: "asc",
        },
      });

      // Remove the dragged item from its current position
      const orderedItems = visibleItems.filter((item) => item.id !== dragged.id);

      // Find the index of the dragged item and the dropped item
      const dragIndex = visibleItems.findIndex((item) => item.id === dragged.id);
      const dropIndex = visibleItems.findIndex((item) => item.id === dropped.id);

      // Determine the new index for the dragged item
      let newIndex;
      if (dragIndex < dropIndex) {
        newIndex = dropIndex + 1; // Insert after the dropped item
      } else {
        newIndex = dropIndex; // Insert before the dropped item
      }

      // Insert the dragged item at the new position
      orderedItems.splice(newIndex, 0, dragged);

      // Now, we need to update all the items with their new sortIndex
      await prisma.$transaction(
        orderedItems.map((item, index) => {
          return prisma.testScenario.update({
            where: {
              id: item.id,
            },
            data: {
              sortIndex: index,
            },
          });
        }),
      );
    }),

  replaceWithValues: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        values: z.record(z.string()),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const existing = await prisma.testScenario.findUnique({
        where: {
          id: input.id,
        },
      });

      if (!existing) {
        throw new Error(`Scenario with id ${input.id} does not exist`);
      }

      await requireCanModifyExperiment(existing.experimentId, ctx);

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

      const promptVariants = await prisma.promptVariant.findMany({
        where: {
          experimentId: newScenario.experimentId,
          visible: true,
        },
      });

      for (const variant of promptVariants) {
        await generateNewCell(variant.id, newScenario.id, { stream: true });
      }

      return newScenario;
    }),
});
