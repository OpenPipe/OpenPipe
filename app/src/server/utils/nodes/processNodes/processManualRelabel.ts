import { sql } from "kysely";

import { kysely, prisma } from "~/server/db";
import { ManualRelabelOutputs, typedNode } from "../node.types";
import { forwardNodeData } from "../forwardNodeData";

export const processManualRelabel = async (nodeId: string) => {
  const node = await prisma.node
    .findUnique({
      where: { id: nodeId },
    })
    .then((n) => (n ? typedNode(n) : null));
  if (node?.type !== "ManualRelabel") return;

  await kysely
    .updateTable("NodeData")
    .where("NodeData.nodeId", "=", node.id)
    .where("NodeData.status", "=", "PENDING")
    .set({
      status: "PROCESSING",
    })
    .execute();

  // process all cached entries
  await kysely
    .updateTable("NodeData")
    .set({
      inputHash: sql`"cpnd"."outgoingDEIHash"`,
      outputHash: sql`"cpnd"."outgoingDEOHash"`,
      split: sql`"cpnd"."outgoingSplit"`,
    })
    .from("CachedProcessedNodeData as cpnd")
    .where("NodeData.nodeId", "=", node.id)
    .where("NodeData.status", "=", "PROCESSING")
    .whereRef("cpnd.importId", "=", "NodeData.importId")
    .where("cpnd.nodeHash", "=", node.hash)
    .execute();

  // TODO: apply general inputHash rules

  await forwardNodeData({
    nodeId,
    nodeOutputLabel: ManualRelabelOutputs.Relabeled,
    selectionExpression: manualRelabelRelabeledSelectionExpression,
  });
  await forwardNodeData({
    nodeId,
    nodeOutputLabel: ManualRelabelOutputs.Unprocessed,
    selectionExpression: manualRelabelUnprocessedSelectionExpression,
  });

  await kysely
    .updateTable("NodeData")
    .where("NodeData.nodeId", "=", node.id)
    .where("NodeData.status", "=", "PROCESSING")
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
    .selectFrom("NodeData as nd")
    .where("nd.nodeId", "=", originNodeId)
    .where("nd.status", "=", "PROCESSING")
    .innerJoin("CachedProcessedNodeData as cpnd", (eb) =>
      eb
        .onRef("cpnd.incomingDEIHash", "=", "nd.inputHash")
        .on("cpnd.nodeHash", "=", originNodeHash),
    )
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
    .selectFrom("NodeData as nd")
    .where("nd.nodeId", "=", originNodeId)
    .where("nd.status", "=", "PROCESSING")
    .leftJoin("CachedProcessedNodeData as cpnd", (eb) =>
      eb
        .onRef("cpnd.incomingDEIHash", "=", "nd.inputHash")
        .on("cpnd.nodeHash", "=", originNodeHash),
    )
    .where("cpnd.id", "is", null)
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
