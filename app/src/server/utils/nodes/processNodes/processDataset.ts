import { kysely, prisma } from "~/server/db";
import { DatasetOutputs, typedNode } from "../node.types";
import { forwardNodeData } from "../forwardNodeData";
import { updateDatasetPruningRuleMatches } from "./updatePruningRuleMatches";
import { startDatasetTestJobs } from "./startTestJobs";

export const processDataset = async (nodeId: string) => {
  const node = await prisma.node
    .findUnique({
      where: { id: nodeId },
    })
    .then((n) => (n ? typedNode(n) : null));
  if (node?.type !== "Dataset") return;

  const dataset = await kysely
    .selectFrom("Dataset as d")
    .where("d.nodeId", "=", node.id)
    .select(["id"])
    .executeTakeFirst();

  if (!dataset) return;

  await kysely
    .updateTable("NodeData as nd")
    .where("nd.status", "=", "PENDING")
    .where("nd.nodeId", "=", node.id)
    .set({
      status: "PROCESSING",
    })
    .execute();

  // update pruning rule matches
  await updateDatasetPruningRuleMatches({
    nodeHash: node.hash,
    datasetId: dataset.id,
    nodeDataBaseQuery: kysely
      .selectFrom("NodeData as nd")
      .where("nd.nodeId", "=", node.id)
      .where("nd.status", "=", "PROCESSING"),
  });

  // start test jobs
  await startDatasetTestJobs({
    datasetId: dataset.id,
    nodeDataBaseQuery: kysely
      .selectFrom("NodeData as nd")
      .where("nd.nodeId", "=", node.id)
      .where("nd.status", "=", "PROCESSING"),
  });

  await kysely
    .updateTable("NodeData")
    .where("NodeData.nodeId", "=", node.id)
    .where("NodeData.status", "=", "PROCESSING")
    .set({
      status: "PROCESSED",
    })
    .execute();

  await forwardNodeData({
    nodeId,
    nodeOutputLabel: DatasetOutputs.Entries,
  });
};
