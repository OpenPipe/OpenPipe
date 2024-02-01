import { type Node } from "@prisma/client";
import { kysely } from "~/server/db";
import { LLMRelabelOutputs, MonitorOutputs, typedNode } from "~/server/utils/nodes/node.types";

export const getDescendantNodes = (nodeId: string) => {
  return kysely
    .selectFrom("Node as originalNode")
    .where("originalNode.id", "=", nodeId)
    .leftJoin("NodeOutput as no", "no.nodeId", "originalNode.id")
    .innerJoin("DataChannel as dc", "dc.originId", "no.id")
    .innerJoin("Node as descendantNode", "descendantNode.id", "dc.destinationId");
};

export const getDownstreamDatasets = (monitorNodeId: string) => {
  return kysely
    .selectFrom("Node as monitorNode")
    .where("monitorNode.id", "=", monitorNodeId)
    .innerJoin("NodeOutput as monitorNodeOutput", "monitorNodeOutput.nodeId", "monitorNode.id")
    .where("monitorNodeOutput.label", "=", MonitorOutputs.MatchedLogs)
    .innerJoin("DataChannel as dc", "dc.originId", "monitorNodeOutput.id")
    .innerJoin("Node as monitorLLMRelabelNode", "monitorLLMRelabelNode.id", "dc.destinationId")
    .innerJoin(
      "NodeOutput as monitorLLMRelabelNodeOutput",
      "monitorLLMRelabelNodeOutput.nodeId",
      "monitorLLMRelabelNode.id",
    )
    .where("monitorLLMRelabelNodeOutput.label", "=", LLMRelabelOutputs.Relabeled)
    .innerJoin("DataChannel as dc2", "dc2.originId", "monitorLLMRelabelNodeOutput.id")
    .innerJoin("Node as datasetLLMRelabelNode", "datasetLLMRelabelNode.id", "dc2.destinationId")
    .innerJoin(
      "NodeOutput as datasetLLMRelabelNodeOutput",
      "datasetLLMRelabelNodeOutput.nodeId",
      "datasetLLMRelabelNode.id",
    )
    .where("datasetLLMRelabelNodeOutput.label", "=", LLMRelabelOutputs.Relabeled)
    .innerJoin("DataChannel as dc3", "dc3.originId", "datasetLLMRelabelNodeOutput.id")
    .innerJoin("Node as manualRelabelNode", "manualRelabelNode.id", "dc3.destinationId")
    .innerJoin(
      "NodeOutput as manualRelabelNodeOutput",
      "manualRelabelNodeOutput.nodeId",
      "manualRelabelNode.id",
    )
    .innerJoin("DataChannel as dc4", "dc4.originId", "manualRelabelNodeOutput.id")
    .innerJoin("Node as datasetNode", "datasetNode.id", "dc4.destinationId")
    .innerJoin("Dataset as d", "d.nodeId", "datasetNode.id")
    .distinctOn("datasetNode.id");
};

export const getUpstreamMonitors = (datasetNode: Node) => {
  const tNode = typedNode(datasetNode);
  if (tNode.type !== "Dataset") {
    throw new Error("Node is not a Dataset");
  }

  const { llmRelabelNodeId } = tNode.config;

  return kysely
    .selectFrom("Node as datasetLLMRelabelNode")
    .where("datasetLLMRelabelNode.id", "=", llmRelabelNodeId)
    .innerJoin("DataChannel as dc1", "dc1.destinationId", "datasetLLMRelabelNode.id")
    .innerJoin(
      "NodeOutput as monitorLLMRelabelNodeOutput",
      "monitorLLMRelabelNodeOutput.id",
      "dc1.originId",
    )
    .innerJoin(
      "Node as monitorLLMRelabelNode",
      "monitorLLMRelabelNode.id",
      "monitorLLMRelabelNodeOutput.nodeId",
    )
    .innerJoin("DataChannel as dc2", "dc2.destinationId", "monitorLLMRelabelNode.id")
    .innerJoin("NodeOutput as monitorNodeOutput", "monitorNodeOutput.id", "dc2.originId")
    .innerJoin("Node as monitorNode", "monitorNode.id", "monitorNodeOutput.nodeId")
    .distinctOn("monitorNode.id");
};
