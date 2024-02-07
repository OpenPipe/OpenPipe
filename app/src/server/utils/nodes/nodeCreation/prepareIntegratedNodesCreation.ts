import { type Prisma } from "@prisma/client";
import { v4 as uuidv4 } from "uuid";

import {
  prepareDatasetCreation,
  prepareLLMRelabelCreation,
  prepareManualRelabelCreation,
} from "./prepareNodeCreation";
import { RelabelOptions } from "../node.types";
import { prisma } from "~/server/db";

export const prepareIntegratedDatasetCreation = ({
  projectId,
  datasetName,
}: {
  projectId: string;
  datasetName: string;
}) => {
  const datasetId = uuidv4();
  const prismaCreations: Prisma.PrismaPromise<unknown>[] = [];

  const preparedLLMRelabelCreation = prepareLLMRelabelCreation({
    nodeParams: {
      name: "Dataset LLM Relabel",
      projectId,
      config: {
        relabelLLM: RelabelOptions.SkipRelabel,
        maxEntriesPerMinute: 100,
        maxLLMConcurrency: 2,
      },
    },
  });

  prismaCreations.push(...preparedLLMRelabelCreation.prismaCreations);

  const preparedManualRelabelCreation = prepareManualRelabelCreation({
    nodeParams: {
      name: "Dataset Manual Relabel",
      projectId,
      config: {
        nodeId: preparedLLMRelabelCreation.relabelNodeId,
      },
    },
  });

  prismaCreations.push(
    ...preparedManualRelabelCreation.prismaCreations,
    prisma.dataChannel.create({
      data: {
        originId: preparedLLMRelabelCreation.relabeledOutputId,
        destinationId: preparedManualRelabelCreation.relabelNodeId,
      },
    }),
    prisma.dataChannel.create({
      data: {
        originId: preparedLLMRelabelCreation.unprocessedOutputId,
        destinationId: preparedManualRelabelCreation.relabelNodeId,
      },
    }),
  );

  const preparedDatasetCreation = prepareDatasetCreation({
    nodeParams: {
      name: datasetName,
      projectId,
      config: {
        llmRelabelNodeId: preparedLLMRelabelCreation.relabelNodeId,
        manualRelabelNodeId: preparedManualRelabelCreation.relabelNodeId,
      },
    },
  });

  prismaCreations.push(
    ...preparedDatasetCreation.prismaCreations,
    prisma.dataChannel.create({
      data: {
        originId: preparedManualRelabelCreation.relabeledOutputId,
        destinationId: preparedDatasetCreation.datasetNodeId,
      },
    }),
    prisma.dataChannel.create({
      data: {
        originId: preparedManualRelabelCreation.unprocessedOutputId,
        destinationId: preparedDatasetCreation.datasetNodeId,
      },
    }),
    prisma.dataset.create({
      data: {
        id: datasetId,
        name: datasetName,
        projectId,
        nodeId: preparedDatasetCreation.datasetNodeId,
      },
    }),
  );

  return { prismaCreations, datasetId, llmRelabelNodeId: preparedLLMRelabelCreation.relabelNodeId };
};
