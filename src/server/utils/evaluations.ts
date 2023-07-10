import { type Evaluation } from "@prisma/client";
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

  const modelOutputs = await prisma.modelOutput.findMany({
    where: { promptVariantId: variantId, statusCode: { notIn: [429] }, testScenario: { visible: true } },
    include: { testScenario: true },
  });

  await Promise.all(
    evaluations.map(async (evaluation) => {
      const passCount = modelOutputs.filter((output) =>
        evaluateOutput(output, output.testScenario, evaluation),
      ).length;
      const failCount = modelOutputs.length - passCount;

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

  const modelOutputs = await prisma.modelOutput.findMany({
    where: {
      promptVariantId: { in: variants.map((v) => v.id) },
      testScenario: { visible: true },
      statusCode: { notIn: [429] },
    },
    include: { testScenario: true },
  });

  await Promise.all(
    variants.map(async (variant) => {
      const outputs = modelOutputs.filter((output) => output.promptVariantId === variant.id);
      const passCount = outputs.filter((output) =>
        evaluateOutput(output, output.testScenario, evaluation),
      ).length;
      const failCount = outputs.length - passCount;

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
