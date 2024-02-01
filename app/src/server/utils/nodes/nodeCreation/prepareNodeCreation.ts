import { type Prisma } from "@prisma/client";
import { v4 as uuidv4 } from "uuid";

import {
  type InferNodeConfig,
  DatasetOutputs,
  LLMRelabelOutputs,
  ArchiveOutputs,
  MonitorOutputs,
  ManualRelabelOutputs,
} from "../node.types";
import { checkNodeInput } from "../checkNodeInput";
import { prisma } from "~/server/db";

export const prepareArchiveCreation = ({
  nodeParams,
}: {
  nodeParams: Omit<Prisma.NodeUncheckedCreateInput, "type" | "config" | "hash"> & {
    config: InferNodeConfig<"Archive">;
    hash?: string;
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
        nodeId: archiveNodeId,
        label: ArchiveOutputs.Entries,
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
    hash?: string;
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
        nodeId: monitorNodeId,
        label: MonitorOutputs.MatchedLogs,
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

export const prepareLLMRelabelCreation = ({
  nodeParams,
}: {
  nodeParams: Omit<Prisma.NodeUncheckedCreateInput, "type" | "config" | "hash"> & {
    config: InferNodeConfig<"LLMRelabel">;
    hash?: string;
  };
}) => {
  const relabelNodeId = nodeParams.id || uuidv4();
  const relabeledOutputId = uuidv4();
  const unprocessedOutputId = uuidv4();
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
        label: LLMRelabelOutputs.Relabeled,
      },
    }),
    prisma.nodeOutput.create({
      data: {
        id: unprocessedOutputId,
        nodeId: relabelNodeId,
        label: LLMRelabelOutputs.Unprocessed,
      },
    }),
  ];

  return { prismaCreations, relabelNodeId, relabeledOutputId, unprocessedOutputId };
};

export const prepareManualRelabelCreation = ({
  nodeParams,
}: {
  nodeParams: Omit<Prisma.NodeUncheckedCreateInput, "type" | "config" | "hash"> & {
    config: InferNodeConfig<"ManualRelabel">;
    hash?: string;
  };
}) => {
  const relabelNodeId = nodeParams.id || uuidv4();
  const relabeledOutputId = uuidv4();
  const unprocessedOutputId = uuidv4();
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
        label: ManualRelabelOutputs.Relabeled,
      },
    }),
    prisma.nodeOutput.create({
      data: {
        id: unprocessedOutputId,
        nodeId: relabelNodeId,
        label: ManualRelabelOutputs.Unprocessed,
      },
    }),
  ];

  return { prismaCreations, relabelNodeId, relabeledOutputId, unprocessedOutputId };
};

export const prepareDatasetCreation = ({
  nodeParams,
}: {
  nodeParams: Omit<Prisma.NodeUncheckedCreateInput, "type" | "config" | "hash"> & {
    config: InferNodeConfig<"Dataset">;
    hash?: string;
  };
}) => {
  const datasetNodeId = nodeParams.id || uuidv4();
  const entriesOutputId = uuidv4();
  const prismaCreations: Prisma.PrismaPromise<unknown>[] = [
    prisma.node.create({
      data: checkNodeInput({
        ...nodeParams,
        id: datasetNodeId,
        type: "Dataset",
      }),
    }),
    prisma.nodeOutput.create({
      data: {
        nodeId: datasetNodeId,
        label: DatasetOutputs.Entries,
      },
    }),
  ];

  return { prismaCreations, datasetNodeId, entriesOutputId };
};
