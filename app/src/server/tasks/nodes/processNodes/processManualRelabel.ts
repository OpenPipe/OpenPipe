import { sql } from "kysely";
import { type DatasetEntrySplit } from "@prisma/client";

import { kysely, prisma } from "~/server/db";
import {
  ManualRelabelOutput,
  typedNode,
  type NodeProperties,
} from "~/server/utils/nodes/node.types";
import { forwardNodeEntries } from "./forwardNodeEntries";

export const manualRelabelProperties: NodeProperties = {
  cacheMatchFields: ["nodeEntryPersistentId", "incomingInputHash"],
  cacheWriteFields: ["outgoingInputHash", "outgoingOutputHash", "outgoingSplit"],
  readBatchSize: 10000,
  outputs: [{ label: ManualRelabelOutput.Relabeled }],
};

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
    // selectionExpression: manualRelabelRelabeledSelectionExpression,
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
    .innerJoin("CachedProcessedEntry as cpne", (eb) =>
      eb
        .onRef("cpne.incomingInputHash", "=", "ne.inputHash")
        .onRef("cpne.nodeEntryPersistentId", "=", "ne.persistentId")
        .on("cpne.nodeHash", "=", originNodeHash),
    )
    .select([
      sql<DatasetEntrySplit>`cpne."outgoingSplit"`.as("split"),
      sql<string>`"cpne"."outgoingInputHash"`.as("inputHash"),
      sql<string>`"cpne"."outgoingOutputHash"`.as("outputHash"),
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
    .leftJoin("CachedProcessedEntry as cpne", (eb) =>
      eb
        .onRef("cpne.incomingInputHash", "=", "ne.inputHash")
        .onRef("cpne.nodeEntryPersistentId", "=", "ne.persistentId")
        .on("cpne.nodeHash", "=", originNodeHash),
    )
    .where("cpne.id", "is", null)
    .select(["ne.split", "ne.inputHash", "ne.outputHash"]);
