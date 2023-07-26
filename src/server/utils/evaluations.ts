import { type ModelResponse, type Evaluation, Prisma } from "@prisma/client";
import { prisma } from "../db";
import { runOneEval } from "./runOneEval";
import { type Scenario } from "~/components/OutputsTable/types";
import { type SupportedProvider } from "~/modelProviders/types";

const runAndSaveEval = async (
  evaluation: Evaluation,
  scenario: Scenario,
  modelResponse: ModelResponse,
  provider: SupportedProvider,
) => {
  const result = await runOneEval(evaluation, scenario, modelResponse, provider);
  return await prisma.outputEvaluation.upsert({
    where: {
      modelResponseId_evaluationId: {
        modelResponseId: modelResponse.id,
        evaluationId: evaluation.id,
      },
    },
    create: {
      modelResponseId: modelResponse.id,
      evaluationId: evaluation.id,
      ...result,
    },
    update: {
      ...result,
    },
  });
};

export const runEvalsForOutput = async (
  experimentId: string,
  scenario: Scenario,
  modelResponse: ModelResponse,
  provider: SupportedProvider,
) => {
  const evaluations = await prisma.evaluation.findMany({
    where: { experimentId },
  });

  await Promise.all(
    evaluations.map(
      async (evaluation) => await runAndSaveEval(evaluation, scenario, modelResponse, provider),
    ),
  );
};

export const runAllEvals = async (experimentId: string) => {
  const outputs = await prisma.modelResponse.findMany({
    where: {
      outdated: false,
      output: {
        not: Prisma.AnyNull,
      },
      scenarioVariantCell: {
        promptVariant: {
          experimentId,
          visible: true,
        },
        testScenario: {
          visible: true,
        },
      },
    },
    include: {
      scenarioVariantCell: {
        include: {
          testScenario: true,
          promptVariant: true,
        },
      },
      outputEvaluations: true,
    },
  });
  const evals = await prisma.evaluation.findMany({
    where: { experimentId },
  });

  await Promise.all(
    outputs.map(async (output) => {
      const evalsToBeRun = evals.filter(
        (evaluation) => !output.outputEvaluations.find((e) => e.evaluationId === evaluation.id),
      );

      await Promise.all(
        evalsToBeRun.map(async (evaluation) => {
          await runAndSaveEval(
            evaluation,
            output.scenarioVariantCell.testScenario,
            output,
            output.scenarioVariantCell.promptVariant.modelProvider as SupportedProvider,
          );
        }),
      );
    }),
  );
};
