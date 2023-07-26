import { type ModelResponse, type Evaluation, Prisma } from "@prisma/client";
import { prisma } from "../db";
import { runOneEval } from "./runOneEval";
import { type Scenario } from "~/components/OutputsTable/types";

const saveResult = async (evaluation: Evaluation, scenario: Scenario, modelResponse: ModelResponse) => {
  const result = await runOneEval(evaluation, scenario, modelResponse);
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
) => {
  const evaluations = await prisma.evaluation.findMany({
    where: { experimentId },
  });

  await Promise.all(
    evaluations.map(async (evaluation) => await saveResult(evaluation, scenario, modelResponse)),
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
      const unrunEvals = evals.filter(
        (evaluation) => !output.outputEvaluations.find((e) => e.evaluationId === evaluation.id),
      );

      await Promise.all(
        unrunEvals.map(async (evaluation) => {
          await saveResult(evaluation, output.scenarioVariantCell.testScenario, output);
        }),
      );
    }),
  );
};
