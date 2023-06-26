import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { prisma } from "~/server/db";
import { OpenAIChatConfig } from "~/server/types";

export const promptVariantsRouter = createTRPCRouter({
  list: publicProcedure.input(z.object({ experimentId: z.string() })).query(async ({ input }) => {
    return await prisma.promptVariant.findMany({
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
      const lastScenario = await prisma.promptVariant.findFirst({
        where: {
          experimentId: input.experimentId,
        },
        orderBy: {
          sortIndex: "desc",
        },
      });

      const largestSortIndex =
        (
          await prisma.promptVariant.aggregate({
            where: {
              experimentId: input.experimentId,
            },
            _max: {
              sortIndex: true,
            },
          })
        )._max?.sortIndex ?? 0;

      const newScenario = await prisma.promptVariant.create({
        data: {
          experimentId: input.experimentId,
          label: `Prompt Variant ${largestSortIndex + 2}`,
          sortIndex: (lastScenario?.sortIndex ?? 0) + 1,
          config: lastScenario?.config ?? {},
        },
      });

      return newScenario;
    }),

  update: publicProcedure
    .input(
      z.object({
        id: z.string(),
        updates: z.object({
          label: z.string().optional(),
        }),
      })
    )
    .mutation(async ({ input }) => {
      const existing = await prisma.promptVariant.findUnique({
        where: {
          id: input.id,
        },
      });

      if (!existing) {
        throw new Error(`Prompt Variant with id ${input.id} does not exist`);
      }

      return await prisma.promptVariant.update({
        where: {
          id: input.id,
        },
        data: input.updates,
      });
    }),

  hide: publicProcedure
    .input(
      z.object({
        id: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      return await prisma.promptVariant.update({
        where: { id: input.id },
        data: { visible: false },
      });
    }),

  replaceWithConfig: publicProcedure
    .input(
      z.object({
        id: z.string(),
        config: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const existing = await prisma.promptVariant.findUnique({
        where: {
          id: input.id,
        },
      });

      let parsedConfig;
      try {
        parsedConfig = JSON.parse(input.config) as OpenAIChatConfig;
      } catch (e) {
        throw new Error(`Invalid JSON: ${(e as Error).message}`);
      }

      if (!existing) {
        throw new Error(`Prompt Variant with id ${input.id} does not exist`);
      }

      // Create a duplicate with only the config changed
      const newVariant = await prisma.promptVariant.create({
        data: {
          experimentId: existing.experimentId,
          label: existing.label,
          sortIndex: existing.sortIndex,
          uiId: existing.uiId,
          config: parsedConfig,
        },
      });

      // Hide anything with the same uiId besides the new one
      await prisma.promptVariant.updateMany({
        where: {
          uiId: existing.uiId,
          id: {
            not: newVariant.id,
          },
        },
        data: {
          visible: false,
        },
      });

      return newVariant;
    }),

  reorder: publicProcedure
    .input(
      z.object({
        draggedId: z.string(),
        droppedId: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const dragged = await prisma.promptVariant.findUnique({
        where: {
          id: input.draggedId,
        },
      });

      const dropped = await prisma.promptVariant.findUnique({
        where: {
          id: input.droppedId,
        },
      });

      if (!dragged || !dropped || dragged.experimentId !== dropped.experimentId) {
        throw new Error(
          `Prompt Variant with id ${input.draggedId} or ${input.droppedId} does not exist`
        );
      }

      const visibleItems = await prisma.promptVariant.findMany({
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
          return prisma.promptVariant.update({
            where: {
              id: item.id,
            },
            data: {
              sortIndex: index,
            },
          });
        })
      );
    }),
});
