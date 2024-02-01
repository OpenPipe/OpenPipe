import { kysely, prisma } from "~/server/db";
import { DatasetOutputs, typedNode } from "../node.types";
import { forwardNodeData } from "../forwardNodeData";

export const processDataset = async (nodeId: string) => {
  const node = await prisma.node
    .findUnique({
      where: { id: nodeId },
    })
    .then((n) => (n ? typedNode(n) : null));
  if (node?.type !== "Dataset") return;

  // update pruning rule matches
  // start test jobs

  await kysely
    .updateTable("NodeData")
    .where("NodeData.nodeId", "=", node.id)
    .where("NodeData.status", "=", "PENDING")
    .set({
      status: "PROCESSED",
    })
    .execute();

  await forwardNodeData({
    nodeId,
    nodeOutputLabel: DatasetOutputs.Entries,
  });
};
