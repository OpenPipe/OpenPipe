import { sql } from "kysely";
import { type Node } from "@prisma/client";

import { kysely, prisma } from "~/server/db";
import { type OutputSelectionCriteria } from "~/server/utils/nodes/nodeProperties/nodeProperties.types";
import { selectEntriesWithCache } from "./updateCached";

export const forwardNodeEntries = async ({
  node,
  nodeOutputLabel,
  selectionCriteria,
}: {
  node: Pick<Node, "id" | "hash" | "type">;
  nodeOutputLabel: string;
  selectionCriteria?: OutputSelectionCriteria;
}) => {
  const outputDataChannels = await kysely
    .selectFrom("Node as originNode")
    .where("originNode.id", "=", node.id)
    .innerJoin("NodeOutput as no", "no.nodeId", "originNode.id")
    .where("no.label", "=", nodeOutputLabel)
    .innerJoin("DataChannel as dc", "dc.originId", "no.id")
    .innerJoin("Node as destinationNode", "destinationNode.id", "dc.destinationId")
    .select(["dc.id as channelId", "no.label as label"])
    .execute();

  for (const outputDataChannel of outputDataChannels) {
    const processingStartTime = new Date();

    const { channelId } = outputDataChannel;

    await kysely
      .insertInto("NodeEntry")
      .columns([
        "split",
        "inputHash",
        "outputHash",
        "id",
        "persistentId",
        "dataChannelId",
        "parentNodeEntryId",
        "loggedCallId",
        "originalOutputHash",
        "updatedAt",
      ])
      .expression((eb) =>
        eb
          .selectFrom(
            selectEntriesWithCache({ node, filterOutcome: selectionCriteria?.filterOutcome }).as(
              "ne",
            ),
          )
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
