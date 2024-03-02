import { kysely } from "~/server/db";
import { enqueueProcessNode } from "~/server/tasks/nodes/processNodes/processNode.task";

export const enqueueDescendants = async (nodeId: string) => {
  const descendants = await kysely
    .selectFrom("Node as parentNode")
    .where("parentNode.id", "=", nodeId)
    .innerJoin("NodeOutput as no", "no.nodeId", "parentNode.id")
    .innerJoin("DataChannel as dc", "dc.originId", "no.id")
    .innerJoin("Node as descendantNode", "descendantNode.id", "dc.destinationId")
    .distinctOn("descendantNode.id")
    .select(["descendantNode.id", "no.id as nodeOutputId", "dc.id as dataChannelId"])
    .execute();

  for (const descendant of descendants) {
    await enqueueProcessNode({ nodeId: descendant.id });
  }
};
