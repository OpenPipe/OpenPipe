import { type Prisma } from "@prisma/client";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";

import {
  prepareDatasetCreation,
  prepareLLMRelabelCreation,
  prepareManualRelabelCreation,
  prepareMonitorCreation,
} from "./prepareNodeCreation";
import { DEFAULT_MAX_OUTPUT_SIZE, RelabelOptions } from "../node.types";
import { prisma } from "~/server/db";
import { type filtersSchema } from "~/types/shared.types";

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

export const prepareIntegratedMonitorCreation = ({
  projectId,
  initialFilters,
}: {
  projectId: string;
  initialFilters: z.infer<typeof filtersSchema>;
}) => {
  const llmRelabelNodeId = uuidv4();
  const prismaCreations: Prisma.PrismaPromise<unknown>[] = [];

  const preparedMonitorCreation = prepareMonitorCreation({
    nodeParams: {
      name: "New Monitor",
      projectId,
      config: {
        llmRelabelNodeId,
        initialFilters,
        checkFilters: initialFilters,
        lastLoggedCallUpdatedAt: new Date(0),
        maxEntriesPerMinute: 100,
        maxLLMConcurrency: 2,
        maxOutputSize: DEFAULT_MAX_OUTPUT_SIZE,
      },
    },
  });

  prismaCreations.push(...preparedMonitorCreation.prismaCreations);

  const preparedLLMRelabelCreation = prepareLLMRelabelCreation({
    nodeParams: {
      id: llmRelabelNodeId,
      name: "Monitor LLM Relabel",
      projectId,
      config: {
        relabelLLM: RelabelOptions.SkipRelabel,
        maxEntriesPerMinute: 100,
        maxLLMConcurrency: 2,
      },
    },
  });

  return {
    prismaCreations,
    monitorNodeId: preparedMonitorCreation.monitorNodeId,
    llmRelabelNodeId: preparedLLMRelabelCreation.relabelNodeId,
  };
};
