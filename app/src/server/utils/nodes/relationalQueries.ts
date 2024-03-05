import { kysely } from "~/server/db";
import { MonitorOutput } from "./nodeProperties/monitorProperties";
import { LLMRelabelOutput } from "./nodeProperties/llmRelabelProperties";

export const getDownstreamDatasets = ({ monitorFilterNodeId }: { monitorFilterNodeId: string }) => {
  return kysely
    .selectFrom("Node as filterNode")
    .where("filterNode.id", "=", monitorFilterNodeId)
    .innerJoin("NodeOutput as filterNodeOutput", "filterNodeOutput.nodeId", "filterNode.id")
    .where("filterNodeOutput.label", "=", MonitorOutput.MatchedLogs)
    .innerJoin("DataChannel as dc", "dc.originId", "filterNodeOutput.id")
    .innerJoin("Node as monitorLLMRelabelNode", "monitorLLMRelabelNode.id", "dc.destinationId")
    .innerJoin(
      "NodeOutput as monitorLLMRelabelNodeOutput",
      "monitorLLMRelabelNodeOutput.nodeId",
      "monitorLLMRelabelNode.id",
    )
    .where("monitorLLMRelabelNodeOutput.label", "=", LLMRelabelOutput.Relabeled)
    .innerJoin("DataChannel as dc2", "dc2.originId", "monitorLLMRelabelNodeOutput.id")
    .innerJoin("Node as datasetLLMRelabelNode", "datasetLLMRelabelNode.id", "dc2.destinationId")
    .innerJoin(
      "NodeOutput as datasetLLMRelabelNodeOutput",
      "datasetLLMRelabelNodeOutput.nodeId",
      "datasetLLMRelabelNode.id",
    )
    .where("datasetLLMRelabelNodeOutput.label", "=", LLMRelabelOutput.Relabeled)
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
