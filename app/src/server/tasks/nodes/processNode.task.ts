import type { NodeType } from "@prisma/client";

import defineTask from "../defineTask";
import { kysely, prisma } from "~/server/db";
import { constructLoggedCallFiltersQuery } from "~/server/utils/constructLoggedCallFiltersQuery";
import { typedNode } from "~/server/utils/nodes/node.types";

export type ProcessNodeJob = {
  nodeId: string;
  nodeType: NodeType;
};

export const processNode = defineTask<ProcessNodeJob>({
  id: "processNode",
  handler: async (task) => {
    const { nodeId, nodeType } = task;
    if (nodeType === "Monitor") {
      await processMonitor(nodeId);
    }
  },
});

const processMonitor = async (nodeId: string) => {
  const node = await prisma.node
    .findUnique({
      where: { id: nodeId },
      include: {
        project: true,
      },
    })
    .then((n) => (n ? typedNode(n) : null));
  if (node?.type !== "Monitor") return;

  await kysely
    .selectFrom("MonitorMatch")
    .where("monitorId", "=", nodeId)
    .where("status", "=", "PENDING")
    .orderBy("createdAt", "asc")
    .execute();
};
