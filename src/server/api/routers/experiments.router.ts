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
  requireCanViewExperiment,
  requireNothing,
} from "~/utils/accessControl";
import userOrg from "~/server/utils/userOrg";
import generateTypes from "~/modelProviders/generateTypes";

export const experimentsRouter = createTRPCRouter({
  list: protectedProcedure.query(async ({ ctx }) => {
    // Anyone can list experiments
    requireNothing(ctx);

    const experiments = await prisma.experiment.findMany({
      where: {
        organization: {
          organizationUsers: {
            some: { userId: ctx.session.user.id },
          },
        },
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

  get: publicProcedure.input(z.object({ id: z.string() })).query(async ({ input, ctx }) => {
    await requireCanViewExperiment(input.id, ctx);
    const experiment = await prisma.experiment.findFirstOrThrow({
      where: { id: input.id },
    });

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

  fork: protectedProcedure.input(z.object({ id: z.string() })).mutation(async ({ input, ctx }) => {
    await requireCanViewExperiment(input.id, ctx);

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
          modelOutput: {
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

    const maxSortIndex =
      (
        await prisma.experiment.aggregate({
          _max: {
            sortIndex: true,
          },
        })
      )._max?.sortIndex ?? 0;

    const newExperiment = await prisma.experiment.create({
      data: {
        sortIndex: maxSortIndex + 1,
        label: `${existingExp.label} (forked)`,
        organizationId: (await userOrg(ctx.session.user.id)).id,
      },
    });

    const existingToNewVariantIds = new Map<string, string>();
    const variantsToCreate: Prisma.PromptVariantCreateManyInput[] = [];
    for (const variant of existingVariants) {
      const newVariantId = uuidv4();
      existingToNewVariantIds.set(variant.id, newVariantId);
      variantsToCreate.push({
        ...variant,
        id: newVariantId,
        experimentId: newExperiment.id,
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
        experimentId: newExperiment.id,
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
        experimentId: newExperiment.id,
      });
    }

    const cellsToCreate: Prisma.ScenarioVariantCellCreateManyInput[] = [];
    const modelOutputsToCreate: Prisma.ModelOutputCreateManyInput[] = [];
    const outputEvaluationsToCreate: Prisma.OutputEvaluationCreateManyInput[] = [];
    for (const cell of existingCells) {
      const newCellId = uuidv4();
      const { modelOutput, ...cellData } = cell;
      cellsToCreate.push({
        ...cellData,
        id: newCellId,
        promptVariantId: existingToNewVariantIds.get(cell.promptVariantId) ?? "",
        testScenarioId: existingToNewScenarioIds.get(cell.testScenarioId) ?? "",
        prompt: (cell.prompt as Prisma.InputJsonValue) ?? undefined,
      });
      if (modelOutput) {
        const newModelOutputId = uuidv4();
        const { outputEvaluations, ...modelOutputData } = modelOutput;
        modelOutputsToCreate.push({
          ...modelOutputData,
          id: newModelOutputId,
          scenarioVariantCellId: newCellId,
          output: (modelOutput.output as Prisma.InputJsonValue) ?? undefined,
        });
        for (const evaluation of outputEvaluations) {
          outputEvaluationsToCreate.push({
            ...evaluation,
            id: uuidv4(),
            modelOutputId: newModelOutputId,
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
        experimentId: newExperiment.id,
      });
    }

    await prisma.$transaction([
      prisma.promptVariant.createMany({
        data: variantsToCreate,
      }),
      prisma.testScenario.createMany({
        data: scenariosToCreate,
      }),
      prisma.scenarioVariantCell.createMany({
        data: cellsToCreate,
      }),
      prisma.modelOutput.createMany({
        data: modelOutputsToCreate,
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

    return {
      ...newExperiment,
      access: {
        canView: true,
        canModify: true,
      },
    };
  }),

  create: protectedProcedure.input(z.object({})).mutation(async ({ ctx }) => {
    // Anyone can create an experiment
    requireNothing(ctx);

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
        organizationId: (await userOrg(ctx.session.user.id)).id,
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
          constructFn: dedent`
          /**
           * Use Javascript to define an OpenAI chat completion
           * (https://platform.openai.com/docs/api-reference/chat/create).
           *
           * You have access to the current scenario in the \`scenario\`
           * variable.
           */
          
          definePrompt("openai/ChatCompletion", {
            model: "gpt-3.5-turbo-0613",
            stream: true,
            messages: [
              {
                role: "system",
                content: \`Write 'Start experimenting!' in ${"$"}{scenario.language}\`,
              },
            ],
          });`,
          model: "gpt-3.5-turbo-0613",
          modelProvider: "openai/ChatCompletion",
          constructFnVersion: 2,
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
