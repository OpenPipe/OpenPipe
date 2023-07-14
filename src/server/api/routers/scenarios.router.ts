import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { prisma } from "~/server/db";
import { autogenerateScenarioValues } from "../autogen";
import { recordExperimentUpdated } from "~/server/utils/recordExperimentUpdated";
import { reevaluateAll } from "~/server/utils/evaluations";
import { generateNewCell } from "~/server/utils/generateNewCell";

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
        autogenerate: z.boolean().optional(),
      }),
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

      const createNewScenarioAction = prisma.testScenario.create({
        data: {
          experimentId: input.experimentId,
          sortIndex: maxSortIndex + 1,
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
        await generateNewCell(variant.id, scenario.id);
      }
    }),

  hide: publicProcedure.input(z.object({ id: z.string() })).mutation(async ({ input }) => {
    const hiddenScenario = await prisma.testScenario.update({
      where: { id: input.id },
      data: { visible: false, experiment: { update: { updatedAt: new Date() } } },
    });

    // Reevaluate all evaluations now that this scenario is hidden
    await reevaluateAll(hiddenScenario.experimentId);

    return hiddenScenario;
  }),

  reorder: publicProcedure
    .input(
      z.object({
        draggedId: z.string(),
        droppedId: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
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

  replaceWithValues: publicProcedure
    .input(
      z.object({
        id: z.string(),
        values: z.record(z.string()),
      }),
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
