import { type ModelOutput, type Evaluation } from "@prisma/client";
import { prisma } from "../db";
import { runOneEval } from "./runOneEval";
import { type Scenario } from "~/components/OutputsTable/types";

const saveResult = async (evaluation: Evaluation, scenario: Scenario, modelOutput: ModelOutput) => {
  const result = await runOneEval(evaluation, scenario, modelOutput);
  return await prisma.outputEvaluation.upsert({
    where: {
      modelOutputId_evaluationId: {
        modelOutputId: modelOutput.id,
        evaluationId: evaluation.id,
      },
    },
    create: {
      modelOutputId: modelOutput.id,
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
  modelOutput: ModelOutput,
) => {
  const evaluations = await prisma.evaluation.findMany({
    where: { experimentId },
  });

  await Promise.all(
    evaluations.map(async (evaluation) => await saveResult(evaluation, scenario, modelOutput)),
  );
};

export const runAllEvals = async (experimentId: string) => {
  const outputs = await prisma.modelOutput.findMany({
    where: {
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
      outputEvaluation: true,
    },
  });
  const evals = await prisma.evaluation.findMany({
    where: { experimentId },
  });

  await Promise.all(
    outputs.map(async (output) => {
      const unrunEvals = evals.filter(
        (evaluation) => !output.outputEvaluation.find((e) => e.evaluationId === evaluation.id),
      );

      await Promise.all(
        unrunEvals.map(async (evaluation) => {
          await saveResult(evaluation, output.scenarioVariantCell.testScenario, output);
        }),
      );
    }),
  );
};
