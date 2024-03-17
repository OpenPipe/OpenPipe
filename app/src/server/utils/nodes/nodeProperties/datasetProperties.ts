import { kysely } from "~/server/db";
import { updateDatasetPruningRuleMatches } from "~/server/utils/nodes/updatePruningRuleMatches";
import { startDatasetTestJobs } from "~/server/utils/nodes/startTestJobs";
import { DatasetOutput, type NodeProperties } from "./nodeProperties.types";
import { datasetNodeSchema } from "../node.types";

export const datasetProperties: NodeProperties<"Dataset"> = {
  schema: datasetNodeSchema,
  outputs: [{ label: DatasetOutput.Entries }],
  afterProcessing: async (node) => {
    const dataset = await kysely
      .selectFrom("Dataset as d")
      .where("d.nodeId", "=", node.id)
      .select(["id"])
      .executeTakeFirst();

    if (!dataset) throw new Error("Dataset not found");

    await kysely
      .updateTable("NodeEntry as ne")
      .set({ status: "PROCESSED" })
      .from("DataChannel as dc")
      .where("dc.destinationId", "=", node.id)
      .whereRef("ne.dataChannelId", "=", "dc.id")
      .where("ne.status", "=", "PENDING")
      .execute();

    // update pruning rule matches
    await updateDatasetPruningRuleMatches({
      nodeHash: node.hash,
      datasetId: dataset.id,
      nodeEntryBaseQuery: kysely
        .selectFrom("NodeEntry as ne")
        .innerJoin("DataChannel as dc", (join) =>
          join.onRef("dc.id", "=", "ne.dataChannelId").on("dc.destinationId", "=", node.id),
        )
        .where("ne.status", "=", "PROCESSED"),
    });

    // start test jobs
    await startDatasetTestJobs({
      datasetId: dataset.id,
      nodeEntryBaseQuery: kysely
        .selectFrom("NodeEntry as ne")
        .innerJoin("DataChannel as dc", (join) =>
          join.onRef("dc.id", "=", "ne.dataChannelId").on("dc.destinationId", "=", node.id),
        )
        .where("ne.status", "=", "PROCESSED"),
    });
  },
};
