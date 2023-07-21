import { z } from "zod";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "~/server/api/trpc";
import { prisma } from "~/server/db";
import { generateNewCell } from "~/server/utils/generateNewCell";
import { type SupportedModel } from "~/server/types";
import userError from "~/server/utils/error";
import { recordExperimentUpdated } from "~/server/utils/recordExperimentUpdated";
import { reorderPromptVariants } from "~/server/utils/reorderPromptVariants";
import { type PromptVariant } from "@prisma/client";
import { deriveNewConstructFn } from "~/server/utils/deriveNewContructFn";
import { requireCanModifyExperiment, requireCanViewExperiment } from "~/utils/accessControl";
import parseConstructFn from "~/server/utils/parseConstructFn";

export const promptVariantsRouter = createTRPCRouter({
  list: publicProcedure
    .input(z.object({ experimentId: z.string() }))
    .query(async ({ input, ctx }) => {
      await requireCanViewExperiment(input.experimentId, ctx);

      return await prisma.promptVariant.findMany({
        where: {
          experimentId: input.experimentId,
          visible: true,
        },
        orderBy: { sortIndex: "asc" },
      });
    }),

  stats: publicProcedure
    .input(z.object({ variantId: z.string() }))
    .query(async ({ input, ctx }) => {
      const variant = await prisma.promptVariant.findUnique({
        where: {
          id: input.variantId,
        },
      });

      if (!variant) {
        throw new Error(`Prompt Variant with id ${input.variantId} does not exist`);
      }

      await requireCanViewExperiment(variant.experimentId, ctx);

      const outputEvals = await prisma.outputEvaluation.groupBy({
        by: ["evaluationId"],
        _sum: {
          result: true,
        },
        _count: {
          id: true,
        },
        where: {
          modelOutput: {
            scenarioVariantCell: {
              promptVariant: {
                id: input.variantId,
                visible: true,
              },
              testScenario: {
                visible: true,
              },
            },
          },
        },
      });

      const evals = await prisma.evaluation.findMany({
        where: {
          experimentId: variant.experimentId,
        },
      });

      const evalResults = evals.map((evalItem) => {
        const evalResult = outputEvals.find(
          (outputEval) => outputEval.evaluationId === evalItem.id,
        );
        return {
          id: evalItem.id,
          label: evalItem.label,
          passCount: evalResult?._sum?.result ?? 0,
          totalCount: evalResult?._count?.id ?? 1,
        };
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
            is: {},
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
          },
        },
        _sum: {
          cost: true,
          promptTokens: true,
          completionTokens: true,
        },
      });

      const promptTokens = overallTokens._sum?.promptTokens ?? 0;
      const completionTokens = overallTokens._sum?.completionTokens ?? 0;

      const awaitingRetrievals = !!(await prisma.scenarioVariantCell.findFirst({
        where: {
          promptVariantId: input.variantId,
          testScenario: { visible: true },
          // Check if is PENDING or IN_PROGRESS
          retrievalStatus: {
            in: ["PENDING", "IN_PROGRESS"],
          },
        },
      }));

      return {
        evalResults,
        promptTokens,
        completionTokens,
        overallCost: overallTokens._sum?.cost ?? 0,
        scenarioCount,
        outputCount,
        awaitingRetrievals,
      };
    }),

  create: protectedProcedure
    .input(
      z.object({
        experimentId: z.string(),
        variantId: z.string().optional(),
        newModel: z.string().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      await requireCanViewExperiment(input.experimentId, ctx);

      let originalVariant: PromptVariant | null = null;
      if (input.variantId) {
        originalVariant = await prisma.promptVariant.findUnique({
          where: {
            id: input.variantId,
          },
        });
      } else {
        originalVariant = await prisma.promptVariant.findFirst({
          where: {
            experimentId: input.experimentId,
            visible: true,
          },
          orderBy: {
            sortIndex: "desc",
          },
        });
      }

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

      const newVariantLabel =
        input.variantId && originalVariant
          ? `${originalVariant?.label} Copy`
          : `Prompt Variant ${largestSortIndex + 2}`;

      const newConstructFn = await deriveNewConstructFn(
        originalVariant,
        input.newModel as SupportedModel,
      );

      const createNewVariantAction = prisma.promptVariant.create({
        data: {
          experimentId: input.experimentId,
          label: newVariantLabel,
          sortIndex: (originalVariant?.sortIndex ?? 0) + 1,
          constructFn: newConstructFn,
          constructFnVersion: 2,
          model: originalVariant?.model ?? "gpt-3.5-turbo",
          modelProvider: originalVariant?.modelProvider ?? "openai/ChatCompletion",
        },
      });

      const [newVariant] = await prisma.$transaction([
        createNewVariantAction,
        recordExperimentUpdated(input.experimentId),
      ]);

      if (originalVariant) {
        // Insert new variant to right of original variant
        await reorderPromptVariants(newVariant.id, originalVariant.id, true);
      }

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

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        updates: z.object({
          label: z.string().optional(),
        }),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const existing = await prisma.promptVariant.findUnique({
        where: {
          id: input.id,
        },
      });

      if (!existing) {
        throw new Error(`Prompt Variant with id ${input.id} does not exist`);
      }

      await requireCanModifyExperiment(existing.experimentId, ctx);

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

  hide: protectedProcedure
    .input(
      z.object({
        id: z.string(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const { experimentId } = await prisma.promptVariant.findUniqueOrThrow({
        where: { id: input.id },
      });
      await requireCanModifyExperiment(experimentId, ctx);

      const updatedPromptVariant = await prisma.promptVariant.update({
        where: { id: input.id },
        data: { visible: false, experiment: { update: { updatedAt: new Date() } } },
      });

      return updatedPromptVariant;
    }),

  getModifiedPromptFn: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        instructions: z.string().optional(),
        newModel: z.string().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const existing = await prisma.promptVariant.findUniqueOrThrow({
        where: {
          id: input.id,
        },
      });
      await requireCanModifyExperiment(existing.experimentId, ctx);

      const constructedPrompt = await parseConstructFn(existing.constructFn);

      if ("error" in constructedPrompt) {
        return userError(constructedPrompt.error);
      }

      const promptConstructionFn = await deriveNewConstructFn(
        existing,
        input.newModel as SupportedModel | undefined,
        input.instructions,
      );

      // TODO: Validate promptConstructionFn
      // TODO: Record in some sort of history

      return promptConstructionFn;
    }),

  replaceVariant: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        constructFn: z.string(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const existing = await prisma.promptVariant.findUniqueOrThrow({
        where: {
          id: input.id,
        },
      });
      await requireCanModifyExperiment(existing.experimentId, ctx);

      if (!existing) {
        throw new Error(`Prompt Variant with id ${input.id} does not exist`);
      }

      const parsedPrompt = await parseConstructFn(input.constructFn);

      if ("error" in parsedPrompt) {
        return userError(parsedPrompt.error);
      }

      // Create a duplicate with only the config changed
      const newVariant = await prisma.promptVariant.create({
        data: {
          experimentId: existing.experimentId,
          label: existing.label,
          sortIndex: existing.sortIndex,
          uiId: existing.uiId,
          constructFn: input.constructFn,
          constructFnVersion: 2,
          modelProvider: parsedPrompt.modelProvider,
          model: parsedPrompt.model,
        },
      });

      // Hide anything with the same uiId besides the new one
      const hideOldVariants = prisma.promptVariant.updateMany({
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

      await prisma.$transaction([hideOldVariants, recordExperimentUpdated(existing.experimentId)]);

      const scenarios = await prisma.testScenario.findMany({
        where: {
          experimentId: newVariant.experimentId,
          visible: true,
        },
      });

      for (const scenario of scenarios) {
        await generateNewCell(newVariant.id, scenario.id);
      }

      return { status: "ok" } as const;
    }),

  reorder: protectedProcedure
    .input(
      z.object({
        draggedId: z.string(),
        droppedId: z.string(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const { experimentId } = await prisma.promptVariant.findUniqueOrThrow({
        where: { id: input.draggedId },
      });
      await requireCanModifyExperiment(experimentId, ctx);

      await reorderPromptVariants(input.draggedId, input.droppedId);
    }),
});
