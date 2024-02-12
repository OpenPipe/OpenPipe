import { type Prisma } from "@prisma/client";
import { v4 as uuidv4 } from "uuid";

import {
  type InferNodeConfig,
  DatasetOutput,
  LLMRelabelOutput,
  ArchiveOutput,
  MonitorOutput,
  ManualRelabelOutput,
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
        label: LLMRelabelOutput.Relabeled,
      },
    }),
    prisma.nodeOutput.create({
      data: {
        id: unprocessedOutputId,
        nodeId: relabelNodeId,
        label: LLMRelabelOutput.Unprocessed,
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
        label: ManualRelabelOutput.Relabeled,
      },
    }),
    prisma.nodeOutput.create({
      data: {
        id: unprocessedOutputId,
        nodeId: relabelNodeId,
        label: ManualRelabelOutput.Unprocessed,
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
