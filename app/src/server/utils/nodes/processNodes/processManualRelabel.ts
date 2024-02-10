import { sql } from "kysely";

import { kysely, prisma } from "~/server/db";
import { ManualRelabelOutput, typedNode } from "../node.types";
import { forwardNodeEntries } from "../forwardNodeEntries";

export const processManualRelabel = async (nodeId: string) => {
  const node = await prisma.node
    .findUnique({
      where: { id: nodeId },
    })
    .then((n) => (n ? typedNode(n) : null));
  if (node?.type !== "ManualRelabel") return;

  await kysely
    .updateTable("NodeEntry")
    .where("NodeEntry.nodeId", "=", node.id)
    .where("NodeEntry.status", "=", "PENDING")
    .set({
      status: "PROCESSING",
    })
    .execute();

  // process all cached entries
  await kysely
    .updateTable("NodeEntry")
    .set({
      inputHash: sql`"cpne"."outgoingDEIHash"`,
      outputHash: sql`"cpne"."outgoingDEOHash"`,
      split: sql`"cpne"."outgoingSplit"`,
    })
    .from("CachedProcessedNodeEntry as cpne")
    .where("NodeEntry.nodeId", "=", node.id)
    .where("NodeEntry.status", "=", "PROCESSING")
    .whereRef("cpne.nodeEntryPersistentId", "=", "NodeEntry.persistentId")
    .where("cpne.nodeHash", "=", node.hash)
    .execute();

  // TODO: apply general inputHash rules

  await forwardNodeEntries({
    nodeId,
    nodeOutputLabel: ManualRelabelOutput.Relabeled,
    selectionExpression: manualRelabelRelabeledSelectionExpression,
  });
  await forwardNodeEntries({
    nodeId,
    nodeOutputLabel: ManualRelabelOutput.Unprocessed,
    selectionExpression: manualRelabelUnprocessedSelectionExpression,
  });

  await kysely
    .updateTable("NodeEntry")
    .where("NodeEntry.nodeId", "=", node.id)
    .where("NodeEntry.status", "=", "PROCESSING")
    .set({
      status: "PROCESSED",
    })
    .execute();
};

export const manualRelabelRelabeledSelectionExpression = ({
  originNodeId,
  originNodeHash,
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
    .where("ne.status", "=", "PROCESSING")
    .innerJoin("CachedProcessedNodeEntry as cpne", (eb) =>
      eb
        .onRef("cpne.incomingDEIHash", "=", "ne.inputHash")
        .on("cpne.nodeHash", "=", originNodeHash),
    )
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

export const manualRelabelUnprocessedSelectionExpression = ({
  originNodeId,
  originNodeHash,
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
    .where("ne.status", "=", "PROCESSING")
    .leftJoin("CachedProcessedNodeEntry as cpne", (eb) =>
      eb
        .onRef("cpne.incomingDEIHash", "=", "ne.inputHash")
        .on("cpne.nodeHash", "=", originNodeHash),
    )
    .where("cpne.id", "is", null)
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
