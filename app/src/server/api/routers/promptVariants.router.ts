import { z } from "zod";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "~/server/api/trpc";
import { prisma } from "~/server/db";
import { Prisma } from "@prisma/client";
import { generateNewCell } from "~/server/utils/generateNewCell";
import { error, success } from "~/utils/errorHandling/standardResponses";
import { recordExperimentUpdated } from "~/server/utils/recordExperimentUpdated";
import { reorderPromptVariants } from "~/server/utils/reorderPromptVariants";
import { type PromptVariant } from "@prisma/client";
import { deriveNewConstructFn } from "~/server/utils/deriveNewContructFn";
import { requireCanModifyExperiment, requireCanViewExperiment } from "~/utils/accessControl";
import modelProviders from "~/modelProviders/modelProviders";
import { ZodSupportedProvider } from "~/modelProviders/types";
import parsePromptConstructor from "~/promptConstructor/parse";
import { promptConstructorVersion } from "~/promptConstructor/version";

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
          modelResponse: {
            outdated: false,
            respPayload: { not: Prisma.AnyNull },
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
          modelResponses: {
            some: {
              outdated: false,
              respPayload: {
                not: Prisma.AnyNull,
              },
            },
          },
        },
      });

      const overallTokens = await prisma.modelResponse.aggregate({
        where: {
          outdated: false,
          respPayload: {
            not: Prisma.AnyNull,
          },
          scenarioVariantCell: {
            promptVariantId: input.variantId,
            testScenario: {
              visible: true,
            },
          },
        },
        _sum: {
          cost: true,
          inputTokens: true,
          outputTokens: true,
        },
      });

      const inputTokens = overallTokens._sum?.inputTokens ?? 0;
      const outputTokens = overallTokens._sum?.outputTokens ?? 0;

      const awaitingCompletions = outputCount < scenarioCount;

      const awaitingEvals = !!evalResults.find(
        (result) => result.totalCount < scenarioCount * evals.length,
      );

      return {
        evalResults,
        inputTokens,
        outputTokens,
        overallCost: overallTokens._sum?.cost ?? 0,
        scenarioCount,
        outputCount,
        awaitingCompletions,
        awaitingEvals,
      };
    }),

  create: protectedProcedure
    .input(
      z.object({
        experimentId: z.string(),
        variantId: z.string().optional(),
        streamScenarios: z.array(z.string()),
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

      const newConstructFn = await deriveNewConstructFn(originalVariant);

      const createNewVariantAction = prisma.promptVariant.create({
        data: {
          experimentId: input.experimentId,
          label: newVariantLabel,
          sortIndex: (originalVariant?.sortIndex ?? 0) + 1,
          promptConstructor: newConstructFn,
          promptConstructorVersion:
            originalVariant?.promptConstructorVersion ?? promptConstructorVersion,
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
        await generateNewCell(newVariant.id, scenario.id, {
          stream: input.streamScenarios.includes(scenario.id),
        });
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
        newModel: z
          .object({
            provider: ZodSupportedProvider,
            model: z.string(),
          })
          .optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const existing = await prisma.promptVariant.findUniqueOrThrow({
        where: {
          id: input.id,
        },
      });
      await requireCanModifyExperiment(existing.experimentId, ctx);

      const constructedPrompt = await parsePromptConstructor(existing.promptConstructor);

      if ("error" in constructedPrompt) {
        return error(constructedPrompt.error);
      }

      const model = input.newModel
        ? modelProviders[input.newModel.provider].models[input.newModel.model]
        : undefined;

      const promptConstructionFn = await deriveNewConstructFn(existing, model, input.instructions);

      // TODO: Validate promptConstructionFn
      // TODO: Record in some sort of history

      return promptConstructionFn;
    }),

  replaceVariant: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        promptConstructor: z.string(),
        streamScenarios: z.array(z.string()),
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

      const parsedPrompt = await parsePromptConstructor(input.promptConstructor);

      if ("error" in parsedPrompt) {
        return error(parsedPrompt.error);
      }

      // Create a duplicate with only the config changed
      const newVariant = await prisma.promptVariant.create({
        data: {
          experimentId: existing.experimentId,
          label: existing.label,
          sortIndex: existing.sortIndex,
          uiId: existing.uiId,
          promptConstructor: input.promptConstructor,
          promptConstructorVersion: existing.promptConstructorVersion,
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
        await generateNewCell(newVariant.id, scenario.id, {
          stream: input.streamScenarios.includes(scenario.id),
        });
      }

      return success();
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
