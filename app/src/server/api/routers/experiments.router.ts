import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "~/server/api/trpc";
import { type Prisma } from "@prisma/client";
import { prisma } from "~/server/db";
import dedent from "dedent";
import { generateNewCell } from "~/server/utils/generateNewCell";
import {
  canModifyExperiment,
  requireCanModifyExperiment,
  requireCanModifyProject,
  requireCanViewExperiment,
  requireCanViewProject,
} from "~/utils/accessControl";
import generateTypes from "~/modelProviders/generateTypes";
import { promptConstructorVersion } from "~/promptConstructor/version";
import { error } from "console";

export const experimentsRouter = createTRPCRouter({
  stats: publicProcedure.input(z.object({ id: z.string() })).query(async ({ input, ctx }) => {
    await requireCanViewExperiment(input.id, ctx);

    const [experiment, promptVariantCount, testScenarioCount] = await prisma.$transaction([
      prisma.experiment.findFirstOrThrow({
        where: { id: input.id },
      }),
      prisma.promptVariant.count({
        where: {
          experimentId: input.id,
          visible: true,
        },
      }),
      prisma.testScenario.count({
        where: {
          experimentId: input.id,
          visible: true,
        },
      }),
    ]);

    return {
      experimentLabel: experiment.label,
      promptVariantCount,
      testScenarioCount,
    };
  }),
  list: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ input, ctx }) => {
      await requireCanViewProject(input.projectId, ctx);

      const experiments = await prisma.experiment.findMany({
        where: {
          projectId: input.projectId,
        },
        orderBy: {
          sortIndex: "desc",
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

  get: publicProcedure.input(z.object({ slug: z.string() })).query(async ({ input, ctx }) => {
    const experiment = await prisma.experiment.findFirstOrThrow({
      where: { slug: input.slug },
      include: {
        project: true,
      },
    });

    await requireCanViewExperiment(experiment.id, ctx);

    const canModify = ctx.session?.user.id
      ? await canModifyExperiment(experiment.id, ctx.session?.user.id)
      : false;

    return {
      ...experiment,
      access: {
        canView: true,
        canModify,
      },
    };
  }),

  fork: protectedProcedure
    .input(z.object({ id: z.string(), projectId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      await requireCanViewExperiment(input.id, ctx);
      await requireCanModifyProject(input.projectId, ctx);

      const [
        existingExp,
        existingVariants,
        existingScenarios,
        existingCells,
        evaluations,
        templateVariables,
      ] = await prisma.$transaction([
        prisma.experiment.findUniqueOrThrow({
          where: {
            id: input.id,
          },
        }),
        prisma.promptVariant.findMany({
          where: {
            experimentId: input.id,
            visible: true,
          },
        }),
        prisma.testScenario.findMany({
          where: {
            experimentId: input.id,
            visible: true,
          },
        }),
        prisma.scenarioVariantCell.findMany({
          where: {
            testScenario: {
              visible: true,
            },
            promptVariant: {
              experimentId: input.id,
              visible: true,
            },
          },
          include: {
            modelResponses: {
              include: {
                outputEvaluations: true,
              },
            },
          },
        }),
        prisma.evaluation.findMany({
          where: {
            experimentId: input.id,
          },
        }),
        prisma.templateVariable.findMany({
          where: {
            experimentId: input.id,
          },
        }),
      ]);

      const newExperimentId = uuidv4();

      const existingToNewVariantIds = new Map<string, string>();
      const variantsToCreate: Prisma.PromptVariantCreateManyInput[] = [];
      for (const variant of existingVariants) {
        const newVariantId = uuidv4();
        existingToNewVariantIds.set(variant.id, newVariantId);
        variantsToCreate.push({
          ...variant,
          uiId: uuidv4(),
          id: newVariantId,
          experimentId: newExperimentId,
        });
      }

      const existingToNewScenarioIds = new Map<string, string>();
      const scenariosToCreate: Prisma.TestScenarioCreateManyInput[] = [];
      for (const scenario of existingScenarios) {
        const newScenarioId = uuidv4();
        existingToNewScenarioIds.set(scenario.id, newScenarioId);
        scenariosToCreate.push({
          ...scenario,
          id: newScenarioId,
          uiId: uuidv4(),
          experimentId: newExperimentId,
          variableValues: scenario.variableValues as Prisma.InputJsonValue,
        });
      }

      const existingToNewEvaluationIds = new Map<string, string>();
      const evaluationsToCreate: Prisma.EvaluationCreateManyInput[] = [];
      for (const evaluation of evaluations) {
        const newEvaluationId = uuidv4();
        existingToNewEvaluationIds.set(evaluation.id, newEvaluationId);
        evaluationsToCreate.push({
          ...evaluation,
          id: newEvaluationId,
          experimentId: newExperimentId,
        });
      }

      const cellsToCreate: Prisma.ScenarioVariantCellCreateManyInput[] = [];
      const modelResponsesToCreate: Prisma.ModelResponseCreateManyInput[] = [];
      const outputEvaluationsToCreate: Prisma.OutputEvaluationCreateManyInput[] = [];
      for (const cell of existingCells) {
        const newCellId = uuidv4();
        const { modelResponses, ...cellData } = cell;
        cellsToCreate.push({
          ...cellData,
          id: newCellId,
          promptVariantId: existingToNewVariantIds.get(cell.promptVariantId) ?? "",
          testScenarioId: existingToNewScenarioIds.get(cell.testScenarioId) ?? "",
          prompt: (cell.prompt as Prisma.InputJsonValue) ?? undefined,
        });
        for (const modelResponse of modelResponses) {
          const newModelResponseId = uuidv4();
          const { outputEvaluations, ...modelResponseData } = modelResponse;
          modelResponsesToCreate.push({
            ...modelResponseData,
            id: newModelResponseId,
            scenarioVariantCellId: newCellId,
            respPayload: (modelResponse.respPayload as Prisma.InputJsonValue) ?? undefined,
          });
          for (const evaluation of outputEvaluations) {
            outputEvaluationsToCreate.push({
              ...evaluation,
              id: uuidv4(),
              modelResponseId: newModelResponseId,
              evaluationId: existingToNewEvaluationIds.get(evaluation.evaluationId) ?? "",
            });
          }
        }
      }

      const templateVariablesToCreate: Prisma.TemplateVariableCreateManyInput[] = [];
      for (const templateVariable of templateVariables) {
        templateVariablesToCreate.push({
          ...templateVariable,
          id: uuidv4(),
          experimentId: newExperimentId,
        });
      }

      const maxSortIndex =
        (
          await prisma.experiment.aggregate({
            _max: {
              sortIndex: true,
            },
          })
        )._max?.sortIndex ?? 0;

      await prisma.$transaction([
        prisma.experiment.create({
          data: {
            id: newExperimentId,
            sortIndex: maxSortIndex + 1,
            label: `${existingExp.label} (forked)`,
            projectId: input.projectId,
          },
        }),
        prisma.promptVariant.createMany({
          data: variantsToCreate,
        }),
        prisma.testScenario.createMany({
          data: scenariosToCreate,
        }),
        prisma.scenarioVariantCell.createMany({
          data: cellsToCreate,
        }),
        prisma.modelResponse.createMany({
          data: modelResponsesToCreate,
        }),
        prisma.evaluation.createMany({
          data: evaluationsToCreate,
        }),
        prisma.outputEvaluation.createMany({
          data: outputEvaluationsToCreate,
        }),
        prisma.templateVariable.createMany({
          data: templateVariablesToCreate,
        }),
      ]);

      const newExperiment = await prisma.experiment.findUniqueOrThrow({
        where: { id: newExperimentId },
      });
      return newExperiment;
    }),

  create: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      await requireCanModifyProject(input.projectId, ctx);

      const maxSortIndex =
        (
          await prisma.experiment.aggregate({
            _max: {
              sortIndex: true,
            },
            where: { projectId: input.projectId },
          })
        )._max?.sortIndex ?? 0;

      const exp = await prisma.experiment.create({
        data: {
          sortIndex: maxSortIndex + 1,
          label: `Experiment ${maxSortIndex + 1}`,
          projectId: input.projectId,
        },
      });

      const [variant, _, scenario1, scenario2, scenario3] = await prisma.$transaction([
        prisma.promptVariant.create({
          data: {
            experimentId: exp.id,
            label: "Prompt Variant 1",
            sortIndex: 0,
            // The interpolated $ is necessary until dedent incorporates
            // https://github.com/dmnd/dedent/pull/46
            promptConstructor: dedent`
          /**
           * Use Javascript to define an OpenAI chat completion
           * (https://platform.openai.com/docs/api-reference/chat/create).
           *
           * You have access to the current scenario in the \`scenario\`
           * variable.
           */
          
          definePrompt("openai/ChatCompletion", {
            model: "gpt-3.5-turbo-0613",
            messages: [
              {
                role: "system",
                content: \`Write 'Start experimenting!' in ${"$"}{scenario.language}\`,
              },
            ],
          });`,
            model: "gpt-3.5-turbo-0613",
            modelProvider: "openai/ChatCompletion",
            promptConstructorVersion,
          },
        }),
        prisma.templateVariable.create({
          data: {
            experimentId: exp.id,
            label: "language",
          },
        }),
        prisma.testScenario.create({
          data: {
            experimentId: exp.id,
            variableValues: {
              language: "English",
            },
          },
        }),
        prisma.testScenario.create({
          data: {
            experimentId: exp.id,
            variableValues: {
              language: "Spanish",
            },
          },
        }),
        prisma.testScenario.create({
          data: {
            experimentId: exp.id,
            variableValues: {
              language: "German",
            },
          },
        }),
      ]);

      await generateNewCell(variant.id, scenario1.id);
      await generateNewCell(variant.id, scenario2.id);
      await generateNewCell(variant.id, scenario3.id);

      return exp;
    }),

  createFromLoggedCalls: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        loggedCallIds: z.array(z.string()),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      await requireCanModifyProject(input.projectId, ctx);

      const loggedCalls = await prisma.loggedCall.findMany({
        where: {
          id: {
            in: input.loggedCallIds,
          },
        },
        include: {
          modelResponse: true,
        },
      });

      if (loggedCalls.length === 0 || !loggedCalls[0]) {
        return error("No logged calls found");
      }

      const experimentId = uuidv4();

      const templateVariablesToCreate: Prisma.TemplateVariableCreateManyInput[] = [];
      templateVariablesToCreate.push({
        id: uuidv4(),
        experimentId,
        label: "messages",
      });

      const promptVariantsToCreate: Prisma.PromptVariantCreateManyInput[] = [];
      const originalPromptId = uuidv4();
      const originalPromptObj = loggedCalls[0].modelResponse?.reqPayload as Record<string, unknown>;
      delete originalPromptObj["model"];
      delete originalPromptObj["messages"];
      const keyValueStrings = Object.entries(originalPromptObj).map(
        ([key, value]) => `"${key}": ${JSON.stringify(value)}`,
      );
      const originalPromptObjString = keyValueStrings.join(",\n");
      promptVariantsToCreate.push({
        id: originalPromptId,
        experimentId,
        label: "GPT 3.5",
        sortIndex: 0,
        promptConstructor: dedent`definePrompt("openai/ChatCompletion", {
          model: "gpt-3.5-turbo-0613",
          messages: scenario.messages,
          ${originalPromptObjString}
        });`,
        model: "gpt-3.5-turbo-0613",
        modelProvider: "openai/ChatCompletion",
        promptConstructorVersion,
      });

      const scenariosToCreate: Prisma.TestScenarioCreateManyInput[] = [];
      const scenarioVariantCellsToCreate: Prisma.ScenarioVariantCellCreateManyInput[] = [];
      const modelResponsesToCreate: Prisma.ModelResponseCreateManyInput[] = [];
      for (const loggedCall of loggedCalls) {
        const newScenarioId = uuidv4();
        const reqPayload = loggedCall.modelResponse?.reqPayload as Record<string, unknown>;
        scenariosToCreate.push({
          id: newScenarioId,
          experimentId,
          variableValues: {
            messages: JSON.stringify(reqPayload.messages),
          },
        });

        const newCellId = uuidv4();
        scenarioVariantCellsToCreate.push({
          id: newCellId,
          promptVariantId: originalPromptId,
          testScenarioId: newScenarioId,
          prompt: loggedCall.modelResponse?.reqPayload as Prisma.InputJsonValue,
        });

        if (loggedCall.modelResponse?.cacheKey) {
          modelResponsesToCreate.push({
            scenarioVariantCellId: newCellId,
            cacheKey: loggedCall.modelResponse?.cacheKey,
            requestedAt: loggedCall.modelResponse?.requestedAt,
            receivedAt: loggedCall.modelResponse?.receivedAt,
            inputTokens: loggedCall.modelResponse?.inputTokens,
            cost: loggedCall.modelResponse?.cost,
            outputTokens: loggedCall.modelResponse?.outputTokens,
            statusCode: loggedCall.modelResponse?.statusCode,
            respPayload: loggedCall.modelResponse?.respPayload as Prisma.InputJsonValue,
          });
        }
      }

      const [experiment] = await prisma.$transaction([
        prisma.experiment.create({
          data: {
            id: experimentId,
            sortIndex: 0,
            label: `Experiment from Logs`,
            projectId: input.projectId,
          },
        }),
        prisma.templateVariable.createMany({
          data: templateVariablesToCreate,
        }),
        prisma.promptVariant.createMany({
          data: promptVariantsToCreate,
        }),
        prisma.testScenario.createMany({
          data: scenariosToCreate,
        }),
        prisma.scenarioVariantCell.createMany({
          data: scenarioVariantCellsToCreate,
        }),
        prisma.modelResponse.createMany({
          data: modelResponsesToCreate,
        }),
      ]);

      return experiment.slug;
    }),

  update: protectedProcedure
    .input(z.object({ id: z.string(), updates: z.object({ label: z.string() }) }))
    .mutation(async ({ input, ctx }) => {
      await requireCanModifyExperiment(input.id, ctx);
      return await prisma.experiment.update({
        where: {
          id: input.id,
        },
        data: {
          label: input.updates.label,
        },
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      await requireCanModifyExperiment(input.id, ctx);

      await prisma.experiment.delete({
        where: {
          id: input.id,
        },
      });
    }),

  // Keeping these on `experiment` for now because we might want to limit the
  // providers based on your account/experiment
  promptTypes: publicProcedure.query(async () => {
    return await generateTypes();
  }),
});
