import { type Prisma } from "@prisma/client";
import { prisma } from "../db";
import { queueLLMRetrievalTask } from "./queueLLMRetrievalTask";
import parseConstructFn from "./parseConstructFn";
import { type JsonObject } from "type-fest";
import hashPrompt from "./hashPrompt";

export const generateNewCell = async (variantId: string, scenarioId: string) => {
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

  if (!variant || !scenario) return null;

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

  if (cell) return cell;

  const parsedConstructFn = await parseConstructFn(
    variant.constructFn,
    scenario.variableValues as JsonObject,
  );

  if ("error" in parsedConstructFn) {
    return await prisma.scenarioVariantCell.create({
      data: {
        promptVariantId: variantId,
        testScenarioId: scenarioId,
        statusCode: 400,
        errorMessage: parsedConstructFn.error,
      },
    });
  }

  const inputHash = hashPrompt(parsedConstructFn);

  cell = await prisma.scenarioVariantCell.create({
    data: {
      promptVariantId: variantId,
      testScenarioId: scenarioId,
      prompt: parsedConstructFn.modelInput as unknown as Prisma.InputJsonValue,
    },
    include: {
      modelOutput: true,
    },
  });

  const matchingModelOutput = await prisma.modelOutput.findFirst({
    where: { inputHash },
  });

  let newModelOutput;

  if (matchingModelOutput) {
    newModelOutput = await prisma.modelOutput.create({
      data: {
        scenarioVariantCellId: cell.id,
        inputHash,
        output: matchingModelOutput.output as Prisma.InputJsonValue,
        timeToComplete: matchingModelOutput.timeToComplete,
        cost: matchingModelOutput.cost,
        promptTokens: matchingModelOutput.promptTokens,
        completionTokens: matchingModelOutput.completionTokens,
        createdAt: matchingModelOutput.createdAt,
        updatedAt: matchingModelOutput.updatedAt,
      },
    });
  } else {
    cell = await queueLLMRetrievalTask(cell.id);
  }

  return { ...cell, modelOutput: newModelOutput };
};
