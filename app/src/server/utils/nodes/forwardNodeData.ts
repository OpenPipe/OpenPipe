import { kysely, prisma } from "~/server/db";
import { processNode } from "~/server/tasks/nodes/processNode.task";
import dayjs from "~/utils/dayjs";

export const forwardNodeData = async ({
  nodeId,
  nodeOutputLabel,
  selectionExpression = defaultSelectionExpression,
}: {
  nodeId: string;
  nodeOutputLabel: string;
  selectionExpression?: typeof defaultSelectionExpression;
}) => {
  const outputDataChannels = await kysely
    .selectFrom("Node as originalNode")
    .where("originalNode.id", "=", nodeId)
    .innerJoin("NodeOutput as no", "no.nodeId", "originalNode.id")
    .where("no.label", "=", nodeOutputLabel)
    .innerJoin("DataChannel as dc", "dc.originId", "no.id")
    .innerJoin("Node as destinationNode", "destinationNode.id", "dc.destinationId")
    .select([
      "dc.id as id",
      "dc.lastProcessedAt as lastProcessedAt",
      "destinationNode.id as destinationId",
      "destinationNode.type as nodeType",
    ])
    .execute();

  for (const outputDataChannel of outputDataChannels) {
    const processingStartTime = new Date();

    const { id, destinationId, nodeType, lastProcessedAt } = outputDataChannel;
    await kysely
      .insertInto("NodeData")
      .columns([
        "nodeId",
        "dataChannelId",
        "parentNodeDataId",
        "loggedCallId",
        "inputHash",
        "outputHash",
        "split",
      ])
      .expression(
        selectionExpression({
          originNodeId: nodeId,
          lastProcessedAt,
          destinationNodeId: destinationId,
          channelId: id,
        }),
      )
      .onConflict((oc) => oc.columns(["dataChannelId", "parentNodeDataId"]).doNothing())
      .execute();

    await prisma.dataChannel.update({
      where: {
        id,
      },
      data: {
        lastProcessedAt: processingStartTime,
      },
    });

    await processNode.enqueue({ nodeId: destinationId, nodeType });
  }
};

const defaultSelectionExpression = ({
  originNodeId,
  lastProcessedAt,
  destinationNodeId,
  channelId,
}: {
  originNodeId: string;
  lastProcessedAt: Date;
  destinationNodeId: string;
  channelId: string;
}) =>
  kysely
    .selectFrom("NodeData as nd")
    .where("nd.nodeId", "=", originNodeId)
    .where("nd.status", "=", "PROCESSED")
    .where("nd.updatedAt", ">=", dayjs(lastProcessedAt).subtract(10, "seconds").toDate())
    .select((eb) => [
      eb.val(destinationNodeId).as("nodeId"),
      eb.val(channelId).as("dataChannelId"),
      "nd.id as parentNodeDataId",
      "nd.loggedCallId",
      "nd.inputHash",
      "nd.outputHash",
      "nd.split",
    ]);

export const llmRelabelUnprocessedSelectionExpression = ({
  originNodeId,
  lastProcessedAt,
  destinationNodeId,
  channelId,
}: {
  originNodeId: string;
  lastProcessedAt: Date;
  destinationNodeId: string;
  channelId: string;
}) =>
  kysely
    .selectFrom("NodeData as nd")
    .where("nd.nodeId", "=", originNodeId)
    .where("nd.status", "!=", "PROCESSED")
    .where("nd.createdAt", ">=", dayjs(lastProcessedAt).subtract(10, "seconds").toDate())
    .select((eb) => [
      eb.val(destinationNodeId).as("nodeId"),
      eb.val(channelId).as("dataChannelId"),
      "nd.id as parentNodeDataId",
      "nd.loggedCallId",
      "nd.inputHash",
      "nd.outputHash",
      "nd.split",
    ]);
