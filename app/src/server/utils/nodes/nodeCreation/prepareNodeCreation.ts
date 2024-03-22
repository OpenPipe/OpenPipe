import { type Prisma } from "@prisma/client";
import { v4 as uuidv4 } from "uuid";

import { type InferNodeConfig } from "../node.types";
import { checkNodeInput } from "../checkNodeInput";
import { prisma } from "~/server/db";
import {
  ArchiveOutput,
  MonitorOutput,
  LLMRelabelOutput,
  ManualRelabelOutput,
  DatasetOutput,
  FilterOutput,
} from "../nodeProperties/nodeProperties.types";

export const prepareArchiveCreation = ({
  nodeParams,
}: {
  nodeParams: Omit<Prisma.NodeUncheckedCreateInput, "type" | "config" | "hash"> & {
    config: InferNodeConfig<"Archive">;
  };
}) => {
  const inputChannelId = uuidv4();
  const archiveNodeId = nodeParams.id || uuidv4();
  const entriesOutputId = uuidv4();
  const prismaCreations: Prisma.PrismaPromise<unknown>[] = [
    prisma.node.create({
      data: checkNodeInput({
        ...nodeParams,
        id: archiveNodeId,
        type: "Archive",
      }),
    }),
    prisma.nodeOutput.create({
      data: {
        id: entriesOutputId,
        nodeId: archiveNodeId,
        label: ArchiveOutput.Entries,
      },
    }),
    prisma.dataChannel.create({
      data: {
        id: inputChannelId,
        destinationId: archiveNodeId,
      },
    }),
  ];

  return { prismaCreations, inputChannelId, archiveNodeId, entriesOutputId };
};

export const prepareMonitorCreation = ({
  nodeParams,
}: {
  nodeParams: Omit<Prisma.NodeUncheckedCreateInput, "type" | "config" | "hash"> & {
    config: InferNodeConfig<"Monitor">;
  };
}) => {
  const inputChannelId = uuidv4();
  const monitorNodeId = nodeParams.id || uuidv4();
  const matchedLogsOutputId = uuidv4();
  const prismaCreations: Prisma.PrismaPromise<unknown>[] = [
    prisma.node.create({
      data: checkNodeInput({
        ...nodeParams,
        id: monitorNodeId,
        type: "Monitor",
      }),
    }),
    prisma.nodeOutput.create({
      data: {
        id: matchedLogsOutputId,
        nodeId: monitorNodeId,
        label: MonitorOutput.MatchedLogs,
      },
    }),
    prisma.dataChannel.create({
      data: {
        id: inputChannelId,
        destinationId: monitorNodeId,
      },
    }),
  ];

  return { prismaCreations, inputChannelId, monitorNodeId, matchedLogsOutputId };
};

export const prepareFilterCreation = ({
  nodeParams,
}: {
  nodeParams: Omit<Prisma.NodeUncheckedCreateInput, "type" | "config" | "hash"> & {
    config: InferNodeConfig<"Filter">;
  };
}) => {
  const filterNodeId = nodeParams.id || uuidv4();
  const matchOutputId = uuidv4();
  const missOutputId = uuidv4();
  const prismaCreations: Prisma.PrismaPromise<unknown>[] = [
    prisma.node.create({
      data: checkNodeInput({
        ...nodeParams,
        id: filterNodeId,
        type: "Filter",
      }),
    }),
    prisma.nodeOutput.create({
      data: {
        id: matchOutputId,
        nodeId: filterNodeId,
        label: FilterOutput.Match,
      },
    }),
    prisma.nodeOutput.create({
      data: {
        id: missOutputId,
        nodeId: filterNodeId,
        label: FilterOutput.Miss,
      },
    }),
  ];

  return { prismaCreations, filterNodeId, matchOutputId, missOutputId };
};

export const prepareLLMRelabelCreation = ({
  nodeParams,
}: {
  nodeParams: Omit<Prisma.NodeUncheckedCreateInput, "type" | "config" | "hash"> & {
    config: InferNodeConfig<"LLMRelabel">;
  };
}) => {
  const relabelNodeId = nodeParams.id || uuidv4();
  const relabeledOutputId = uuidv4();
  const prismaCreations: Prisma.PrismaPromise<unknown>[] = [
    prisma.node.create({
      data: checkNodeInput({
        ...nodeParams,
        id: relabelNodeId,
        type: "LLMRelabel",
      }),
    }),
    prisma.nodeOutput.create({
      data: {
        id: relabeledOutputId,
        nodeId: relabelNodeId,
        label: LLMRelabelOutput.Relabeled,
      },
    }),
  ];

  return { prismaCreations, relabelNodeId, relabeledOutputId };
};

export const prepareManualRelabelCreation = ({
  nodeParams,
}: {
  nodeParams: Omit<Prisma.NodeUncheckedCreateInput, "type" | "config" | "hash"> & {
    config: InferNodeConfig<"ManualRelabel">;
  };
}) => {
  const relabelNodeId = nodeParams.id || uuidv4();
  const relabeledOutputId = uuidv4();
  const prismaCreations: Prisma.PrismaPromise<unknown>[] = [
    prisma.node.create({
      data: checkNodeInput({
        ...nodeParams,
        id: relabelNodeId,
        type: "ManualRelabel",
      }),
    }),
    prisma.nodeOutput.create({
      data: {
        id: relabeledOutputId,
        nodeId: relabelNodeId,
        label: ManualRelabelOutput.Relabeled,
      },
    }),
  ];

  return { prismaCreations, relabelNodeId, relabeledOutputId };
};

export const prepareDatasetCreation = ({
  nodeParams,
}: {
  nodeParams: Omit<Prisma.NodeUncheckedCreateInput, "type" | "config" | "hash"> & {
    config: InferNodeConfig<"Dataset">;
  };
}) => {
  const datasetNodeId = nodeParams.id || uuidv4();
  const entriesOutputId = uuidv4();

  const preparedDatasetNodeParams = checkNodeInput({
    ...nodeParams,
    id: datasetNodeId,
    type: "Dataset",
  });

  const prismaCreations: Prisma.PrismaPromise<unknown>[] = [
    prisma.node.create({
      data: preparedDatasetNodeParams,
    }),
    prisma.nodeOutput.create({
      data: {
        id: entriesOutputId,
        nodeId: datasetNodeId,
        label: DatasetOutput.Entries,
      },
    }),
  ];

  return {
    prismaCreations,
    datasetNodeId,
    datasetNodeHash: preparedDatasetNodeParams.hash,
    entriesOutputId,
  };
};
