import { type ModelOutput, type Evaluation } from "@prisma/client";
import { prisma } from "../db";
import { evaluateOutput } from "./evaluateOutput";

export const reevaluateVariant = async (variantId: string) => {
  const variant = await prisma.promptVariant.findUnique({
    where: { id: variantId },
  });
  if (!variant) return;

  const evaluations = await prisma.evaluation.findMany({
    where: { experimentId: variant.experimentId },
  });

  const cells = await prisma.scenarioVariantCell.findMany({
    where: {
      promptVariantId: variantId,
      retrievalStatus: "COMPLETE",
      testScenario: { visible: true },
      modelOutput: { isNot: null },
    },
    include: { testScenario: true, modelOutput: true },
  });

  await Promise.all(
    evaluations.map(async (evaluation) => {
      const passCount = cells.filter((cell) =>
        evaluateOutput(cell.modelOutput as ModelOutput, cell.testScenario, evaluation),
      ).length;
      const failCount = cells.length - passCount;

      await prisma.evaluationResult.upsert({
        where: {
          evaluationId_promptVariantId: {
            evaluationId: evaluation.id,
            promptVariantId: variantId,
          },
        },
        create: {
          evaluationId: evaluation.id,
          promptVariantId: variantId,
          passCount,
          failCount,
        },
        update: {
          passCount,
          failCount,
        },
      });
    }),
  );
};

export const reevaluateEvaluation = async (evaluation: Evaluation) => {
  const variants = await prisma.promptVariant.findMany({
    where: { experimentId: evaluation.experimentId, visible: true },
  });

  const cells = await prisma.scenarioVariantCell.findMany({
    where: {
      promptVariantId: { in: variants.map((v) => v.id) },
      testScenario: { visible: true },
      statusCode: { notIn: [429] },
      modelOutput: { isNot: null },
    },
    include: { testScenario: true, modelOutput: true },
  });

  await Promise.all(
    variants.map(async (variant) => {
      const variantCells = cells.filter((cell) => cell.promptVariantId === variant.id);
      const passCount = variantCells.filter((cell) =>
        evaluateOutput(cell.modelOutput as ModelOutput, cell.testScenario, evaluation),
      ).length;
      const failCount = variantCells.length - passCount;

      await prisma.evaluationResult.upsert({
        where: {
          evaluationId_promptVariantId: {
            evaluationId: evaluation.id,
            promptVariantId: variant.id,
          },
        },
        create: {
          evaluationId: evaluation.id,
          promptVariantId: variant.id,
          passCount,
          failCount,
        },
        update: {
          passCount,
          failCount,
        },
      });
    }),
  );
};

export const reevaluateAll = async (experimentId: string) => {
  const evaluations = await prisma.evaluation.findMany({
    where: { experimentId },
  });

  await Promise.all(evaluations.map(reevaluateEvaluation));
};
