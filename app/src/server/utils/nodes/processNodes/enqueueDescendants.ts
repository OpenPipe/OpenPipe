import { kysely } from "~/server/db";
import { processNode } from "~/server/tasks/nodes/processNode.task";

export const enqueueDescendants = async (nodeId: string) => {
  const descendants = await kysely
    .selectFrom("Node as parentNode")
    .where("parentNode.id", "=", nodeId)
    .innerJoin("NodeOutput as no", "no.nodeId", "parentNode.id")
    .innerJoin("DataChannel as dc", "dc.originId", "no.id")
    .innerJoin("Node as descendantNode", "descendantNode.id", "dc.destinationId")
    .select(["descendantNode.id", "descendantNode.type"])
    .execute();

  for (const descendant of descendants) {
    await processNode.enqueue({ nodeId: descendant.id, nodeType: descendant.type });
  }
};
