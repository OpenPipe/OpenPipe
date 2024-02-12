import { sql } from "kysely";
import { type DatasetEntrySplit } from "@prisma/client";

import { kysely, prisma } from "~/server/db";
import { ManualRelabelOutput, typedNode } from "../node.types";
import { type ForwardEntriesSelectionExpression, forwardNodeEntries } from "../forwardNodeEntries";

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

  await forwardNodeEntries({
    nodeId,
    nodeOutputLabel: ManualRelabelOutput.Relabeled,
    selectionExpression: manualRelabelRelabeledSelectionExpression,
  });
  await forwardNodeEntries({
    nodeId,
    nodeOutputLabel: ManualRelabelOutput.Unprocessed,
    // cpne.id being null throws off type inference
    selectionExpression:
      manualRelabelUnprocessedSelectionExpression as unknown as ForwardEntriesSelectionExpression,
  });

  console.log("entries forwarded");

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
}: {
  originNodeId: string;
  originNodeHash: string;
  lastProcessedAt: Date;
}) =>
  kysely
    .selectFrom("NodeEntry as ne")
    .where("ne.nodeId", "=", originNodeId)
    .where("ne.status", "=", "PROCESSING")
    .innerJoin("CachedProcessedNodeEntry as cpne", (eb) =>
      eb
        .onRef("cpne.incomingDEIHash", "=", "ne.inputHash")
        .onRef("cpne.nodeEntryPersistentId", "=", "ne.persistentId")
        .on("cpne.nodeHash", "=", originNodeHash),
    )
    .select([
      sql<DatasetEntrySplit>`cpne."outgoingSplit"`.as("split"),
      sql<string>`"cpne"."outgoingDEIHash"`.as("inputHash"),
      sql<string>`"cpne"."outgoingDEOHash"`.as("outputHash"),
    ]);

export const manualRelabelUnprocessedSelectionExpression = ({
  originNodeId,
  originNodeHash,
}: {
  originNodeId: string;
  originNodeHash: string;
  lastProcessedAt: Date;
}) =>
  kysely
    .selectFrom("NodeEntry as ne")
    .where("ne.nodeId", "=", originNodeId)
    .where("ne.status", "=", "PROCESSING")
    .leftJoin("CachedProcessedNodeEntry as cpne", (eb) =>
      eb
        .onRef("cpne.incomingDEIHash", "=", "ne.inputHash")
        .onRef("cpne.nodeEntryPersistentId", "=", "ne.persistentId")
        .on("cpne.nodeHash", "=", originNodeHash),
    )
    .where("cpne.id", "is", null)
    .select(["ne.split", "ne.inputHash", "ne.outputHash"]);
