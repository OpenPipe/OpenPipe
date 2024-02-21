import { kysely, prisma } from "~/server/db";
import { DatasetOutput, typedNode } from "~/server/utils/nodes/node.types";
import { forwardNodeEntries } from "./forwardNodeEntries";
import { updateDatasetPruningRuleMatches } from "~/server/utils/nodes/updatePruningRuleMatches";
import { startDatasetTestJobs } from "~/server/utils/nodes/startTestJobs";
import { type NodeProperties } from "./processNode.task";

export const datasetProperties: NodeProperties = {
  afterAll: async (node) => {
    if (node.type !== "Dataset") throw new Error("Node type is not Dataset");

    const dataset = await kysely
      .selectFrom("Dataset as d")
      .where("d.nodeId", "=", node.id)
      .select(["id"])
      .executeTakeFirst();

    if (!dataset) throw new Error("Dataset not found");

    // update pruning rule matches
    await updateDatasetPruningRuleMatches({
      nodeHash: node.hash,
      datasetId: dataset.id,
      nodeEntryBaseQuery: kysely
        .selectFrom("NodeEntry as ne")
        .where("ne.nodeId", "=", node.id)
        .where("ne.status", "=", "PROCESSED"),
    });

    // start test jobs
    await startDatasetTestJobs({
      datasetId: dataset.id,
      nodeEntryBaseQuery: kysely
        .selectFrom("NodeEntry as ne")
        .where("ne.nodeId", "=", node.id)
        .where("ne.status", "=", "PROCESSED"),
    });
  },
  outputs: [{ label: DatasetOutput.Entries }],
};

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
    .updateTable("NodeEntry as ne")
    .where("ne.status", "=", "PENDING")
    .where("ne.nodeId", "=", node.id)
    .set({
      status: "PROCESSING",
    })
    .execute();

  // update pruning rule matches
  await updateDatasetPruningRuleMatches({
    nodeHash: node.hash,
    datasetId: dataset.id,
    nodeEntryBaseQuery: kysely
      .selectFrom("NodeEntry as ne")
      .where("ne.nodeId", "=", node.id)
      .where("ne.status", "=", "PROCESSING"),
  });

  // start test jobs
  await startDatasetTestJobs({
    datasetId: dataset.id,
    nodeEntryBaseQuery: kysely
      .selectFrom("NodeEntry as ne")
      .where("ne.nodeId", "=", node.id)
      .where("ne.status", "=", "PROCESSING"),
  });

  await kysely
    .updateTable("NodeEntry")
    .where("NodeEntry.nodeId", "=", node.id)
    .where("NodeEntry.status", "=", "PROCESSING")
    .set({
      status: "PROCESSED",
    })
    .execute();

  await forwardNodeEntries({
    nodeId,
    nodeOutputLabel: DatasetOutput.Entries,
  });
};
