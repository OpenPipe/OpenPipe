import { type ModelOutput, type Evaluation } from "@prisma/client";
import { prisma } from "../db";
import { runOneEval } from "./runOneEval";
import { type Scenario } from "~/components/OutputsTable/types";

const saveResult = async (evaluation: Evaluation, scenario: Scenario, modelOutput: ModelOutput) => {
  const result = runOneEval(evaluation, scenario, modelOutput);
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
      result,
    },
    update: {
      result,
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

  // const cells = await prisma.scenarioVariantCell.findMany({
  //   where: {
  //     promptVariantId: variantId,
  //     retrievalStatus: "COMPLETE",
  //     testScenario: { visible: true },
  //   },
  //   include: { testScenario: true, modelOutput: { include: { OutputEvaluation: true } } },
  // });

  // await Promise.all(
  //   evaluations.map(async (evaluation) => {
  //     const passCount = cells.filter((cell) =>
  //       runOneEval(cell.modelOutput as ModelOutput, cell.testScenario, evaluation),
  //     ).length;
  //     const failCount = cells.length - passCount;

  //     await prisma.evaluationResult.upsert({
  //       where: {
  //         evaluationId_promptVariantId: {
  //           evaluationId: evaluation.id,
  //           promptVariantId: variantId,
  //         },
  //       },
  //       create: {
  //         evaluationId: evaluation.id,
  //         promptVariantId: variantId,
  //         passCount,
  //         failCount,
  //       },
  //       update: {
  //         passCount,
  //         failCount,
  //       },
  //     });
  //   }),
  // );
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

  // const cells = await prisma.scenarioVariantCell.findMany({
  //   where: {
  //     promptVariantId: { in: variants.map((v) => v.id) },
  //     testScenario: { visible: true },
  //     statusCode: { notIn: [429] },
  //   },
  //   include: { testScenario: true, modelOutput: true },
  // });

  // await Promise.all(
  //   variants.map(async (variant) => {
  //     const variantCells = cells.filter((cell) => cell.promptVariantId === variant.id);
  //     const passCount = variantCells.filter((cell) =>
  //       runOneEval(cell.modelOutput as ModelOutput, cell.testScenario, evaluation),
  //     ).length;
  //     const failCount = variantCells.length - passCount;

  //     await prisma.evaluationResult.upsert({
  //       where: {
  //         evaluationId_promptVariantId: {
  //           evaluationId: evaluation.id,
  //           promptVariantId: variant.id,
  //         },
  //       },
  //       create: {
  //         evaluationId: evaluation.id,
  //         promptVariantId: variant.id,
  //         passCount,
  //         failCount,
  //       },
  //       update: {
  //         passCount,
  //         failCount,
  //       },
  //     });
  //   }),
  // );
};
