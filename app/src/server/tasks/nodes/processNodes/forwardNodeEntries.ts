import { type SelectQueryBuilder, sql } from "kysely";

import { kysely, prisma } from "~/server/db";
import type { DB, NodeEntry } from "~/types/kysely-codegen.types";

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

    const { channelId, destinationNodeId, lastProcessedAt } = outputDataChannel;

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
        selectionExpression()
          .where("ne.nodeId", "=", nodeId)
          .leftJoin("NodeEntry as existingEntry", (join) =>
            join
              .onRef("existingEntry.parentNodeEntryId", "=", "ne.id")
              .on("existingEntry.dataChannelId", "=", channelId),
          )
          .where("existingEntry.id", "is", null)
          .select((eb) => [
            "ne.split",
            "ne.inputHash",
            "ne.outputHash",
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

export type ForwardEntriesSelectionExpression = () => SelectQueryBuilder<
  DB & {
    ne: NodeEntry;
  },
  "ne",
  object
>;

const defaultSelectionExpression: ForwardEntriesSelectionExpression = () =>
  kysely.selectFrom("NodeEntry as ne").where("ne.status", "=", "PROCESSED");
