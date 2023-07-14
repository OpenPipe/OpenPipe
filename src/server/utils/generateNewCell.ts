import crypto from "crypto";
import { type Prisma } from "@prisma/client";
import { prisma } from "../db";
import { queueLLMRetrievalTask } from "./queueLLMRetrievalTask";
import { constructPrompt } from "./constructPrompt";

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

  const prompt = await constructPrompt(variant, scenario.variableValues);

  const inputHash = crypto.createHash("sha256").update(JSON.stringify(prompt)).digest("hex");

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

  cell = await prisma.scenarioVariantCell.create({
    data: {
      promptVariantId: variantId,
      testScenarioId: scenarioId,
    },
    include: {
      modelOutput: true,
    },
  });

  const matchingModelOutput = await prisma.modelOutput.findFirst({
    where: {
      inputHash,
    },
  });

  let newModelOutput;

  if (matchingModelOutput) {
    newModelOutput = await prisma.modelOutput.create({
      data: {
        scenarioVariantCellId: cell.id,
        inputHash,
        output: matchingModelOutput.output as Prisma.InputJsonValue,
        timeToComplete: matchingModelOutput.timeToComplete,
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
