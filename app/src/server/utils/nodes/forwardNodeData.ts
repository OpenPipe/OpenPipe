import { type SelectQueryBuilder, type Selection } from "kysely";

import { kysely, prisma } from "~/server/db";
import { processNode } from "~/server/tasks/nodes/processNode.task";
import type { DB, NodeData } from "~/types/kysely-codegen.types";
import dayjs from "~/utils/dayjs";

export const forwardNodeData = async ({
  nodeId,
  nodeOutputLabel,
  selectionExpression = defaultSelectionExpression,
}: {
  nodeId: string;
  nodeOutputLabel: string;
  selectionExpression?: SelectionExpression;
}) => {
  const outputDataChannels = await kysely
    .selectFrom("Node as originNode")
    .where("originNode.id", "=", nodeId)
    .innerJoin("NodeOutput as no", "no.nodeId", "originNode.id")
    .where("no.label", "=", nodeOutputLabel)
    .innerJoin("DataChannel as dc", "dc.originId", "no.id")
    .innerJoin("Node as destinationNode", "destinationNode.id", "dc.destinationId")
    .select([
      "originNode.hash as originNodeHash",
      "dc.id as channelId",
      "dc.lastProcessedAt as lastProcessedAt",
      "destinationNode.id as destinationNodeId",
      "destinationNode.type as nodeType",
    ])
    .execute();

  for (const outputDataChannel of outputDataChannels) {
    const processingStartTime = new Date();

    const { originNodeHash, channelId, destinationNodeId, nodeType, lastProcessedAt } =
      outputDataChannel;
    await kysely
      .insertInto("NodeData")
      .expression(
        selectionExpression({
          originNodeId: nodeId,
          originNodeHash,
          lastProcessedAt,
          destinationNodeId,
          channelId,
        }),
      )
      .onConflict((oc) => oc.columns(["parentNodeDataId", "dataChannelId"]).doNothing())
      .execute();

    await prisma.dataChannel.update({
      where: {
        id: channelId,
      },
      data: {
        lastProcessedAt: processingStartTime,
      },
    });

    await processNode.enqueue({ nodeId: destinationNodeId, nodeType });
  }
};

type SelectionExpression = (params: {
  originNodeId: string;
  originNodeHash: string;
  lastProcessedAt: Date;
  destinationNodeId: string;
  channelId: string;
}) => SelectQueryBuilder<
  DB & {
    nd: Pick<
      NodeData,
      | "importId"
      | "nodeId"
      | "dataChannelId"
      | "parentNodeDataId"
      | "loggedCallId"
      | "inputHash"
      | "outputHash"
      | "originalOutputHash"
      | "split"
    > & {
      id: string | null;
    };
  },
  "nd",
  Selection<
    DB & {
      nd: Pick<
        NodeData,
        | "importId"
        | "nodeId"
        | "dataChannelId"
        | "parentNodeDataId"
        | "loggedCallId"
        | "inputHash"
        | "outputHash"
        | "originalOutputHash"
        | "split"
      > & {
        id: string | null;
      };
    },
    "nd",
    | "nd.importId"
    | "nd.nodeId"
    | "nd.dataChannelId"
    | "nd.parentNodeDataId"
    | "nd.loggedCallId"
    | "nd.inputHash"
    | "nd.outputHash"
    | "nd.originalOutputHash"
    | "nd.split"
  >
>;

const defaultSelectionExpression: SelectionExpression = ({
  originNodeId,
  lastProcessedAt,
  destinationNodeId,
  channelId,
}: {
  originNodeId: string;
  originNodeHash: string;
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
      "nd.importId as importId",
      eb.val(destinationNodeId).as("nodeId"),
      eb.val(channelId).as("dataChannelId"),
      "nd.id as parentNodeDataId",
      "nd.loggedCallId",
      "nd.inputHash",
      "nd.outputHash",
      "nd.originalOutputHash",
      "nd.split",
    ]);
