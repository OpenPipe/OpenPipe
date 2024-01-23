import { kysely } from "~/server/db";

export const getDescendantNodes = (nodeId: string) => {
  return kysely
    .selectFrom("Node as originalNode")
    .where("originalNode.id", "=", nodeId)
    .leftJoin("NodeOutput as no", "no.nodeId", "originalNode.id")
    .innerJoin("DataChannel as dc", "dc.originId", "no.id")
    .innerJoin("Node as descendantNode", "descendantNode.id", "dc.destinationId");
};
