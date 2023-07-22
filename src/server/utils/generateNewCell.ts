import { type Prisma } from "@prisma/client";
import { prisma } from "../db";
import { queueLLMRetrievalTask } from "./queueLLMRetrievalTask";
import parseConstructFn from "./parseConstructFn";
import { type JsonObject } from "type-fest";
import hashPrompt from "./hashPrompt";
import { omit } from "lodash-es";

export const generateNewCell = async (variantId: string, scenarioId: string): Promise<void> => {
  const variant = await prisma.promptVariant.findUnique({
    where: {
      id: variantId,
    },
  });

  const scenario = await prisma.testScenario.findUnique({
    where: {
      id: scenarioId,
    },
  });

  if (!variant || !scenario) return;

  let cell = await prisma.scenarioVariantCell.findUnique({
    where: {
      promptVariantId_testScenarioId: {
        promptVariantId: variantId,
        testScenarioId: scenarioId,
      },
    },
    include: {
      modelOutput: true,
    },
  });

  if (cell) return;

  const parsedConstructFn = await parseConstructFn(
    variant.constructFn,
    scenario.variableValues as JsonObject,
  );

  if ("error" in parsedConstructFn) {
    await prisma.scenarioVariantCell.create({
      data: {
        promptVariantId: variantId,
        testScenarioId: scenarioId,
        statusCode: 400,
        errorMessage: parsedConstructFn.error,
        retrievalStatus: "ERROR",
      },
    });
    return;
  }

  const inputHash = hashPrompt(parsedConstructFn);

  cell = await prisma.scenarioVariantCell.create({
    data: {
      promptVariantId: variantId,
      testScenarioId: scenarioId,
      prompt: parsedConstructFn.modelInput as unknown as Prisma.InputJsonValue,
      retrievalStatus: "PENDING",
    },
    include: {
      modelOutput: true,
    },
  });

  const matchingModelOutput = await prisma.modelOutput.findFirst({
    where: { inputHash },
  });

  if (matchingModelOutput) {
    const newModelOutput = await prisma.modelOutput.create({
      data: {
        ...omit(matchingModelOutput, ["id"]),
        scenarioVariantCellId: cell.id,
        output: matchingModelOutput.output as Prisma.InputJsonValue,
      },
    });
    await prisma.scenarioVariantCell.update({
      where: { id: cell.id },
      data: { retrievalStatus: "COMPLETE" },
    });

    // Copy over all eval results as well
    await Promise.all(
      (
        await prisma.outputEvaluation.findMany({ where: { modelOutputId: matchingModelOutput.id } })
      ).map(async (evaluation) => {
        await prisma.outputEvaluation.create({
          data: {
            ...omit(evaluation, ["id"]),
            modelOutputId: newModelOutput.id,
          },
        });
      }),
    );
  } else {
    cell = await queueLLMRetrievalTask(cell.id);
  }
};
