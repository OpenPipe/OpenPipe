import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { prisma } from "~/server/db";
import { generateNewCell } from "~/server/utils/generateNewCell";
import { recordExperimentUpdated } from "~/server/utils/recordExperimentUpdated";
import { calculateTokenCost } from "~/utils/calculateTokenCost";

export const promptVariantsRouter = createTRPCRouter({
  list: publicProcedure.input(z.object({ experimentId: z.string() })).query(async ({ input }) => {
    return await prisma.promptVariant.findMany({
      where: {
        experimentId: input.experimentId,
        visible: true,
      },
      orderBy: { sortIndex: "asc" },
    });
  }),

  stats: publicProcedure.input(z.object({ variantId: z.string() })).query(async ({ input }) => {
    const variant = await prisma.promptVariant.findUnique({
      where: {
        id: input.variantId,
      },
    });

    if (!variant) {
      throw new Error(`Prompt Variant with id ${input.variantId} does not exist`);
    }

    const evalResults = await prisma.evaluationResult.findMany({
      where: {
        promptVariantId: input.variantId,
      },
      include: { evaluation: true },
    });

    const scenarioCount = await prisma.testScenario.count({
      where: {
        experimentId: variant.experimentId,
        visible: true,
      },
    });
    const outputCount = await prisma.scenarioVariantCell.count({
      where: {
        promptVariantId: input.variantId,
        testScenario: { visible: true },
        modelOutput: {
          isNot: null,
        },
      },
    });

    const overallTokens = await prisma.modelOutput.aggregate({
      where: {
        scenarioVariantCell: {
          promptVariantId: input.variantId,
          testScenario: {
            visible: true,
          },
        }
      },
      _sum: {
        promptTokens: true,
        completionTokens: true,
      },
    });

    // TODO: fix this
    const model = "gpt-3.5-turbo-0613";
    // const model = getModelName(variant.config);

    const promptTokens = overallTokens._sum?.promptTokens ?? 0;
    const overallPromptCost = calculateTokenCost(model, promptTokens);
    const completionTokens = overallTokens._sum?.completionTokens ?? 0;
    const overallCompletionCost = calculateTokenCost(model, completionTokens, true);

    const overallCost = overallPromptCost + overallCompletionCost;

    return { evalResults, promptTokens, completionTokens, overallCost, scenarioCount, outputCount };
  }),

  create: publicProcedure
    .input(
      z.object({
        experimentId: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      const lastVariant = await prisma.promptVariant.findFirst({
        where: {
          experimentId: input.experimentId,
          visible: true,
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

      const createNewVariantAction = prisma.promptVariant.create({
        data: {
          experimentId: input.experimentId,
          label: `Prompt Variant ${largestSortIndex + 2}`,
          sortIndex: (lastVariant?.sortIndex ?? 0) + 1,
          constructFn: lastVariant?.constructFn ?? "",
        },
      });

      const [newVariant] = await prisma.$transaction([
        createNewVariantAction,
        recordExperimentUpdated(input.experimentId),
      ]);

      const scenarios = await prisma.testScenario.findMany({
        where: {
          experimentId: input.experimentId,
          visible: true,
        },
      });

      for (const scenario of scenarios) {
        await generateNewCell(newVariant.id, scenario.id);
      }

      return newVariant;
    }),

  update: publicProcedure
    .input(
      z.object({
        id: z.string(),
        updates: z.object({
          label: z.string().optional(),
        }),
      }),
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

      const updatePromptVariantAction = prisma.promptVariant.update({
        where: {
          id: input.id,
        },
        data: input.updates,
      });

      const [updatedPromptVariant] = await prisma.$transaction([
        updatePromptVariantAction,
        recordExperimentUpdated(existing.experimentId),
      ]);

      return updatedPromptVariant;
    }),

  hide: publicProcedure
    .input(
      z.object({
        id: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      const updatedPromptVariant = await prisma.promptVariant.update({
        where: { id: input.id },
        data: { visible: false, experiment: { update: { updatedAt: new Date() } } },
      });

      return updatedPromptVariant;
    }),

  replaceVariant: publicProcedure
    .input(
      z.object({
        id: z.string(),
        constructFn: z.string(),
      }),
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

      // Create a duplicate with only the config changed
      const newVariant = await prisma.promptVariant.create({
        data: {
          experimentId: existing.experimentId,
          label: existing.label,
          sortIndex: existing.sortIndex,
          uiId: existing.uiId,
          constructFn: input.constructFn,
        },
      });

      // Hide anything with the same uiId besides the new one
      const hideOldVariantsAction = prisma.promptVariant.updateMany({
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

      await prisma.$transaction([
        hideOldVariantsAction,
        recordExperimentUpdated(existing.experimentId),
      ]);

      const scenarios = await prisma.testScenario.findMany({
        where: {
          experimentId: newVariant.experimentId,
          visible: true,
        },
      });

      for (const scenario of scenarios) {
        await generateNewCell(newVariant.id, scenario.id);
      }

      return newVariant;
    }),

  reorder: publicProcedure
    .input(
      z.object({
        draggedId: z.string(),
        droppedId: z.string(),
      }),
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
          `Prompt Variant with id ${input.draggedId} or ${input.droppedId} does not exist`,
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
        }),
      );
    }),
});
