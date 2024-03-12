import { kysely } from "~/server/db";
import { LLMRelabelOutput } from "./nodeProperties/llmRelabelProperties";

export const getDownstreamDatasets = ({
  monitorLLMRelabelNodeId,
}: {
  monitorLLMRelabelNodeId: string;
}) => {
  return kysely
    .selectFrom("Node as monitorLLMRelabelNode")
    .where("monitorLLMRelabelNode.id", "=", monitorLLMRelabelNodeId)
    .innerJoin(
      "NodeOutput as monitorLLMRelabelNodeOutput",
      "monitorLLMRelabelNodeOutput.nodeId",
      "monitorLLMRelabelNode.id",
    )
    .where("monitorLLMRelabelNodeOutput.label", "=", LLMRelabelOutput.Relabeled)
    .innerJoin("DataChannel as dc1", "dc1.originId", "monitorLLMRelabelNodeOutput.id")
    .innerJoin("Node as manualRelabelNode", "manualRelabelNode.id", "dc1.destinationId")
    .innerJoin(
      "NodeOutput as manualRelabelNodeOutput",
      "manualRelabelNodeOutput.nodeId",
      "manualRelabelNode.id",
    )
    .innerJoin("DataChannel as dc2", "dc2.originId", "manualRelabelNodeOutput.id")
    .innerJoin("Node as datasetNode", "datasetNode.id", "dc2.destinationId")
    .innerJoin("Dataset as d", "d.nodeId", "datasetNode.id")
    .distinctOn(["datasetNode.id"]);
};

export const getSourceLLMRelabelNodes = ({
  datasetManualRelabelNodeId,
}: {
  datasetManualRelabelNodeId: string;
}) =>
  kysely
    .selectFrom("Node as datasetManualRelabelNode")
    .where("datasetManualRelabelNode.id", "=", datasetManualRelabelNodeId)
    .innerJoin(
      "DataChannel as llmManualDC",
      "llmManualDC.destinationId",
      "datasetManualRelabelNode.id",
    )
    .innerJoin("NodeOutput as llmRelabelNo", "llmRelabelNo.id", "llmManualDC.originId")
    .innerJoin("Node as llmRelabelNode", "llmRelabelNode.id", "llmRelabelNo.nodeId")
    .distinctOn("llmRelabelNode.id");

export const getArchives = ({
  datasetManualRelabelNodeId,
}: {
  datasetManualRelabelNodeId: string;
}) =>
  getSourceLLMRelabelNodes({ datasetManualRelabelNodeId })
    .innerJoin("DataChannel as archiveLlmDC", "archiveLlmDC.destinationId", "llmRelabelNode.id")
    .innerJoin("NodeOutput as archiveNodeOutput", "archiveNodeOutput.id", "archiveLlmDC.originId")
    .innerJoin("Node as archiveNode", "archiveNode.id", "archiveNodeOutput.nodeId")
    .where("archiveNode.type", "=", "Archive")
    .distinctOn("archiveNode.id");

export const getMonitors = ({
  datasetManualRelabelNodeId,
}: {
  datasetManualRelabelNodeId: string;
}) =>
  getSourceLLMRelabelNodes({ datasetManualRelabelNodeId })
    .innerJoin("DataChannel as filterLlmDC", "filterLlmDC.destinationId", "llmRelabelNode.id")
    .innerJoin("NodeOutput as filterNodeOutput", "filterNodeOutput.id", "filterLlmDC.originId")
    .innerJoin("Node as filterNode", "filterNode.id", "filterNodeOutput.nodeId")
    .innerJoin("DataChannel as monitorFilterDC", "monitorFilterDC.destinationId", "filterNode.id")
    .innerJoin(
      "NodeOutput as monitorNodeOutput",
      "monitorNodeOutput.id",
      "monitorFilterDC.originId",
    )
    .innerJoin("Node as monitorNode", "monitorNode.id", "monitorNodeOutput.nodeId")
    .distinctOn("monitorNode.id");
