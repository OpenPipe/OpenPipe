import { type SelectQueryBuilder, type Selection, sql } from "kysely";

import { kysely, prisma } from "~/server/db";
import type { DB, NodeEntry } from "~/types/kysely-codegen.types";
// import dayjs from "~/utils/dayjs";

export const forwardNodeEntries = async ({
  nodeId,
  nodeOutputLabel,
  selectionExpression = defaultSelectionExpression,
}: {
  nodeId: string;
  nodeOutputLabel: string;
  selectionExpression?: ForwardEntriesSelectionExpression;
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
      "no.label as label",
    ])
    .execute();

  for (const outputDataChannel of outputDataChannels) {
    const processingStartTime = new Date();

    const { originNodeHash, channelId, destinationNodeId, lastProcessedAt } = outputDataChannel;

    await kysely
      .insertInto("NodeEntry")
      .columns([
        "split",
        "inputHash",
        "outputHash",
        "id",
        "persistentId",
        "nodeId",
        "dataChannelId",
        "parentNodeEntryId",
        "loggedCallId",
        "originalOutputHash",
        "updatedAt",
      ])
      .expression(
        selectionExpression({
          originNodeId: nodeId,
          originNodeHash,
          lastProcessedAt,
        }).select((eb) => [
          sql`uuid_generate_v4()`.as("id"),
          "ne.persistentId",
          eb.val(destinationNodeId).as("nodeId"),
          eb.val(channelId).as("dataChannelId"),
          "ne.id",
          "ne.loggedCallId",
          "ne.originalOutputHash",
          eb.val(new Date()).as("updatedAt"),
        ]),
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
  }
};

export type ForwardEntriesSelectionExpression = (params: {
  originNodeId: string;
  originNodeHash: string;
  lastProcessedAt: Date;
}) => SelectQueryBuilder<
  DB & {
    ne: Pick<
      NodeEntry,
      | "id"
      | "persistentId"
      | "nodeId"
      | "dataChannelId"
      | "parentNodeEntryId"
      | "loggedCallId"
      | "inputHash"
      | "outputHash"
      | "originalOutputHash"
      | "split"
    >;
  },
  "ne",
  Selection<
    DB & {
      ne: Pick<
        NodeEntry,
        | "id"
        | "persistentId"
        | "nodeId"
        | "dataChannelId"
        | "parentNodeEntryId"
        | "loggedCallId"
        | "inputHash"
        | "outputHash"
        | "originalOutputHash"
        | "split"
      >;
    },
    "ne",
    "ne.split" | "ne.inputHash" | "ne.outputHash"
  >
>;

const defaultSelectionExpression: ForwardEntriesSelectionExpression = ({
  originNodeId, // lastProcessedAt,
}: {
  originNodeId: string;
  originNodeHash: string;
  lastProcessedAt: Date;
}) =>
  kysely
    .selectFrom("NodeEntry as ne")
    .where("ne.nodeId", "=", originNodeId)
    .where("ne.status", "=", "PROCESSED")
    // .where("ne.updatedAt", ">=", dayjs(lastProcessedAt).subtract(10, "seconds").utc().toDate())
    .select(["ne.split", "ne.inputHash", "ne.outputHash"]);
