import { type Prisma } from "@prisma/client";
import { v4 as uuidv4 } from "uuid";
import { type z } from "zod";

import {
  prepareArchiveCreation,
  prepareDatasetCreation,
  prepareLLMRelabelCreation,
  prepareManualRelabelCreation,
  prepareMonitorCreation,
  prepareFilterCreation,
} from "./prepareNodeCreation";
import { DEFAULT_MAX_OUTPUT_SIZE, RelabelOption } from "../node.types";
import { prisma } from "~/server/db";
import { type filtersSchema } from "~/types/shared.types";

export const prepareIntegratedArchiveCreation = ({
  projectId,
  name,
  maxOutputSize,
  relabelLLM,
}: {
  projectId: string;
  name: string;
  maxOutputSize: number;
  relabelLLM: RelabelOption;
}) => {
  const prismaCreations: Prisma.PrismaPromise<unknown>[] = [];

  const preparedLLMRelabelCreation = prepareLLMRelabelCreation({
    nodeParams: {
      name: `${name} LLM Relabel`,
      projectId,
      config: {
        relabelLLM,
        maxLLMConcurrency: 2,
      },
    },
  });

  prismaCreations.push(...preparedLLMRelabelCreation.prismaCreations);

  const preparedArchiveCreation = prepareArchiveCreation({
    nodeParams: {
      name,
      projectId,
      config: {
        maxOutputSize,
        relabelNodeId: preparedLLMRelabelCreation.relabelNodeId,
      },
    },
  });

  prismaCreations.push(
    ...preparedArchiveCreation.prismaCreations,
    prisma.dataChannel.create({
      data: {
        originId: preparedArchiveCreation.entriesOutputId,
        destinationId: preparedLLMRelabelCreation.relabelNodeId,
      },
    }),
  );

  return {
    prismaCreations,
    archiveInputChannelId: preparedArchiveCreation.inputChannelId,
    archiveNodeId: preparedArchiveCreation.archiveNodeId,
    relabelNodeId: preparedLLMRelabelCreation.relabelNodeId,
    relabeledOutputId: preparedLLMRelabelCreation.relabeledOutputId,
  };
};

export const prepareIntegratedMonitorCeation = ({
  projectId,
  initialFilters,
}: {
  projectId: string;
  initialFilters: z.infer<typeof filtersSchema>;
}) => {
  const prismaCreations: Prisma.PrismaPromise<unknown>[] = [];

  const preparedLLMRelabelCreation = prepareLLMRelabelCreation({
    nodeParams: {
      name: "Monitor LLM Relabel",
      projectId,
      config: {
        relabelLLM: RelabelOption.SkipRelabel,
        maxLLMConcurrency: 2,
      },
    },
  });

  prismaCreations.push(...preparedLLMRelabelCreation.prismaCreations);

  const preparedFilterCreation = prepareFilterCreation({
    nodeParams: {
      name: "Monitor Filter",
      projectId,
      config: {
        maxLLMConcurrency: 2,
        filters: [],
      },
    },
  });

  prismaCreations.push(
    ...preparedFilterCreation.prismaCreations,
    prisma.dataChannel.create({
      data: {
        originId: preparedFilterCreation.passedOutputId,
        destinationId: preparedLLMRelabelCreation.relabelNodeId,
      },
    }),
  );

  const preparedMonitorCreation = prepareMonitorCreation({
    nodeParams: {
      name: "New Monitor",
      projectId,
      config: {
        maxOutputSize: DEFAULT_MAX_OUTPUT_SIZE,
        sampleRate: 100,
        initialFilters,
        lastLoggedCallUpdatedAt: new Date(0),
        filterNodeId: preparedFilterCreation.filterNodeId,
        relabelNodeId: preparedLLMRelabelCreation.relabelNodeId,
      },
    },
  });

  prismaCreations.push(
    ...preparedMonitorCreation.prismaCreations,
    prisma.dataChannel.create({
      data: {
        originId: preparedMonitorCreation.matchedLogsOutputId,
        destinationId: preparedFilterCreation.filterNodeId,
      },
    }),
  );

  return {
    prismaCreations,
    monitorNodeId: preparedMonitorCreation.monitorNodeId,
  };
};

export const prepareIntegratedDatasetCreation = ({
  projectId,
  datasetName,
}: {
  projectId: string;
  datasetName: string;
}) => {
  const datasetId = uuidv4();
  const prismaCreations: Prisma.PrismaPromise<unknown>[] = [];

  const preparedManualRelabelCreation = prepareManualRelabelCreation({
    nodeParams: {
      name: "Dataset Manual Relabel",
      projectId,
      config: {},
    },
  });

  prismaCreations.push(...preparedManualRelabelCreation.prismaCreations);

  const preparedDatasetCreation = prepareDatasetCreation({
    nodeParams: {
      name: datasetName,
      projectId,
      config: {
        manualRelabelNodeId: preparedManualRelabelCreation.relabelNodeId,
      },
    },
  });

  const manualRelabelDatasetInputChannelId = uuidv4();

  prismaCreations.push(
    ...preparedDatasetCreation.prismaCreations,
    prisma.dataChannel.create({
      data: {
        originId: preparedManualRelabelCreation.relabeledOutputId,
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

  return {
    prismaCreations,
    datasetId,
    datasetNodeId: preparedDatasetCreation.datasetNodeId,
    datasetNodeHash: preparedDatasetCreation.datasetNodeHash,
    manualRelabelDatasetInputChannelId,
    manualRelabelNodeId: preparedManualRelabelCreation.relabelNodeId,
  };
};
