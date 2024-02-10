import { type SelectQueryBuilder, type Selection } from "kysely";

import { kysely, prisma } from "~/server/db";
import { processNode } from "~/server/tasks/nodes/processNode.task";
import type { DB, NodeEntry } from "~/types/kysely-codegen.types";
import dayjs from "~/utils/dayjs";

export const forwardNodeEntries = async ({
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
      .insertInto("NodeEntry")
      .expression(
        selectionExpression({
          originNodeId: nodeId,
          originNodeHash,
          lastProcessedAt,
          destinationNodeId,
          channelId,
        }),
      )
      .onConflict((oc) => oc.columns(["parentNodeEntryId", "dataChannelId"]).doNothing())
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
    ne: Pick<
      NodeEntry,
      | "persistentId"
      | "nodeId"
      | "dataChannelId"
      | "parentNodeEntryId"
      | "loggedCallId"
      | "inputHash"
      | "outputHash"
      | "originalOutputHash"
      | "split"
    > & {
      id: string | null;
    };
  },
  "ne",
  Selection<
    DB & {
      ne: Pick<
        NodeEntry,
        | "persistentId"
        | "nodeId"
        | "dataChannelId"
        | "parentNodeEntryId"
        | "loggedCallId"
        | "inputHash"
        | "outputHash"
        | "originalOutputHash"
        | "split"
      > & {
        id: string | null;
      };
    },
    "ne",
    | "ne.persistentId"
    | "ne.nodeId"
    | "ne.dataChannelId"
    | "ne.parentNodeEntryId"
    | "ne.loggedCallId"
    | "ne.inputHash"
    | "ne.outputHash"
    | "ne.originalOutputHash"
    | "ne.split"
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
    .selectFrom("NodeEntry as ne")
    .where("ne.nodeId", "=", originNodeId)
    .where("ne.status", "=", "PROCESSED")
    .where("ne.updatedAt", ">=", dayjs(lastProcessedAt).subtract(10, "seconds").toDate())
    .select((eb) => [
      "ne.persistentId as persistentId",
      eb.val(destinationNodeId).as("nodeId"),
      eb.val(channelId).as("dataChannelId"),
      "ne.id as parentNodeEntryId",
      "ne.loggedCallId",
      "ne.inputHash",
      "ne.outputHash",
      "ne.originalOutputHash",
      "ne.split",
    ]);
