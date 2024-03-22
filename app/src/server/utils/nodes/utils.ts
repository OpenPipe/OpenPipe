import { NodeEntryStatus, type NodeType } from "@prisma/client";
import { sql } from "kysely";

import { kysely, prisma } from "~/server/db";

export const generatePersistentId = ({
  creationTime,
  key,
  nodeId,
}: {
  creationTime: Date;
  key: string;
  nodeId: string;
}) => `${new Date(creationTime).toISOString()}_${key}_${nodeId}`;

export const creationTimeFromPersistentId = (persistentId: string) => {
  const [creationTime] = persistentId.split("_");

  if (!creationTime) {
    throw new Error("Invalid persistentId");
  }

  return new Date(creationTime);
};

export const printNodeEntries = async ({
  nodeId,
  nodeType,
}: {
  nodeId: string;
  nodeType?: NodeType;
}) => {
  const node = await prisma.node.findUnique({ where: { id: nodeId } });

  if (!node || (nodeType && node.type !== nodeType)) return;
  const nodeEntries = await kysely
    .selectFrom("NodeEntry as ne")
    .innerJoin("DataChannel as dc", (join) =>
      join.onRef("dc.id", "=", "ne.dataChannelId").on("dc.destinationId", "=", nodeId),
    )
    .selectAll("ne")
    .execute();
  console.log(nodeEntries);
};

export const printNodeStats = async ({
  nodeId,
  nodeType,
  message,
}: {
  nodeId: string;
  nodeType?: NodeType;
  message?: string;
}) => {
  const node = await prisma.node.findUnique({ where: { id: nodeId } });

  if (!node || (nodeType && node.type !== nodeType)) return;

  const nodeStats = await kysely
    .selectFrom("NodeEntry as ne")
    .innerJoin("DataChannel as dc", (join) =>
      join.onRef("dc.id", "=", "ne.dataChannelId").on("dc.destinationId", "=", nodeId),
    )
    .select([
      sql<number>`count(case when ne.status = ${NodeEntryStatus.QUEUED} then 1 end)::int`.as(
        "numQueuedEntries",
      ),
      sql<number>`count(case when ne.status = ${NodeEntryStatus.PENDING} then 1 end)::int`.as(
        "numPendingEntries",
      ),
      sql<number>`count(case when ne.status = ${NodeEntryStatus.PROCESSING} then 1 end)::int`.as(
        "numProcessingEntries",
      ),
      sql<number>`count(case when ne.status = ${NodeEntryStatus.ERROR} then 1 end)::int`.as(
        "numErrorEntries",
      ),
      sql<number>`count(case when ne.status = ${NodeEntryStatus.PROCESSED} then 1 end)::int`.as(
        "numProcessedEntries",
      ),
      sql`count(*)::int`.as("total"),
    ])
    .executeTakeFirst();

  if (nodeType) console.log(`Stats for ${nodeType} node ${nodeId} (${message ?? ""})`);
  console.log(nodeStats);
};
