import { Prisma } from "@prisma/client";
import { prisma } from "../db";
import { type JsonObject } from "type-fest";

import hashObject from "~/server/utils/hashObject";
import { omit } from "lodash-es";
import { queueQueryModel } from "../tasks/queryModel.task";
import parsePromptConstructor from "~/promptConstructor/parse";

export const generateNewCell = async (
  variantId: string,
  scenarioId: string,
  options: { stream?: boolean; hardRefetch?: boolean } = {},
): Promise<void> => {
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
      modelResponses: true,
    },
  });

  if (cell) return;

  const parsedConstructFn = await parsePromptConstructor(
    variant.promptConstructor,
    scenario.variableValues as JsonObject,
  );

  if ("error" in parsedConstructFn) {
    await prisma.scenarioVariantCell.create({
      data: {
        promptVariantId: variantId,
        testScenarioId: scenarioId,
        retrievalStatus: "ERROR",
      },
    });
    return;
  }

  const cacheKey = hashObject(parsedConstructFn);

  cell = await prisma.scenarioVariantCell.create({
    data: {
      promptVariantId: variantId,
      testScenarioId: scenarioId,
      prompt: parsedConstructFn.modelInput as unknown as Prisma.InputJsonValue,
      retrievalStatus: "PENDING",
    },
    include: {
      modelResponses: true,
    },
  });

  const matchingModelResponse = await prisma.modelResponse.findFirst({
    where: {
      cacheKey,
      respPayload: {
        not: Prisma.AnyNull,
      },
    },
    orderBy: {
      receivedAt: "desc",
    },
    include: {
      scenarioVariantCell: true,
    },
    take: 1,
  });

  if (matchingModelResponse) {
    const newModelResponse = await prisma.modelResponse.create({
      data: {
        ...omit(matchingModelResponse, ["id", "scenarioVariantCell"]),
        scenarioVariantCellId: cell.id,
        respPayload: matchingModelResponse.respPayload as Prisma.InputJsonValue,
      },
    });

    await prisma.scenarioVariantCell.update({
      where: { id: cell.id },
      data: {
        retrievalStatus: "COMPLETE",
        jobStartedAt: matchingModelResponse.scenarioVariantCell.jobStartedAt,
        jobQueuedAt: matchingModelResponse.scenarioVariantCell.jobQueuedAt,
      },
    });

    // Copy over all eval results as well
    await Promise.all(
      (
        await prisma.outputEvaluation.findMany({
          where: { modelResponseId: matchingModelResponse.id },
        })
      ).map(async (evaluation) => {
        await prisma.outputEvaluation.create({
          data: {
            ...omit(evaluation, ["id"]),
            modelResponseId: newModelResponse.id,
          },
        });
      }),
    );
  } else {
    await queueQueryModel(cell.id, options);
  }
};
