import { kysely } from "~/server/db";
import { constructNodeEntryFiltersQuery } from "~/server/utils/constructNodeEntryFiltersQuery";
import { type NodeProperties } from "./nodeProperties.types";
import { filterNodeSchema } from "../node.types";

export enum FilterOutput {
  Passed = "passed",
  Failed = "failed",
}

export const filterProperties: NodeProperties<"Filter"> = {
  schema: filterNodeSchema,
  cacheMatchFields: ["incomingInputHash", "incomingOutputHash"],
  cacheWriteFields: ["filterOutcome", "explanation"],
  readBatchSize: 10000,
  outputs: [{ label: FilterOutput.Passed }, { label: FilterOutput.Failed }],
  getConcurrency: () => 2,
  beforeProcessing: async (node) => {
    const { filters } = node.config;

    await kysely
      .updateTable("NodeEntry as ne")
      .set({ status: "PROCESSING" })
      .from("DataChannel as dc")
      .whereRef("dc.id", "=", "ne.dataChannelId")
      .where("dc.destinationId", "=", node.id)
      .where("ne.status", "=", "PENDING")
      .execute();

    await kysely
      .insertInto("CachedProcessedEntry")
      .columns(["incomingInputHash", "incomingOutputHash", "filterOutcome"])
      .expression((eb) =>
        constructNodeEntryFiltersQuery({
          filters,
          datasetNodeId: node.id,
          baseQuery: eb.selectFrom("NodeEntry as ne").where("ne.status", "=", "PROCESSING"),
        }).select((eb) => [
          "ne.inputHash",
          "ne.outputHash",
          eb.val(FilterOutput.Passed).as("filterOutcome"),
        ]),
      )
      .execute();

    await kysely
      .insertInto("CachedProcessedEntry")
      .columns(["incomingInputHash", "incomingOutputHash", "filterOutcome"])
      .expression((eb) =>
        eb
          .selectFrom("NodeEntry as ne")
          .innerJoin("DataChannel as dc", (join) =>
            join.onRef("dc.id", "=", "ne.dataChannelId").on("dc.destinationId", "=", node.id),
          )
          .where("ne.status", "=", "PROCESSING")
          .innerJoin("Node as n", "n.id", "dc.destinationId")
          .leftJoin("CachedProcessedEntry as cpe1", (join) =>
            join
              .onRef("cpe1.nodeHash", "=", "n.hash")
              .onRef("cpe1.incomingInputHash", "=", "ne.inputHash")
              .onRef("cpe1.incomingOutputHash", "=", "ne.outputHash"),
          )
          .where("cpe1.incomingInputHash", "is", null)
          .leftJoin("CachedProcessedEntry as cpe2", (join) =>
            join
              .on("cpe2.nodeId", "=", node.id)
              .onRef("cpe2.incomingInputHash", "=", "ne.inputHash")
              .onRef("cpe2.incomingOutputHash", "=", "ne.outputHash"),
          )
          .where("cpe2.incomingInputHash", "is", null)
          .select((eb) => [
            "ne.inputHash",
            "ne.outputHash",
            eb.val(FilterOutput.Failed).as("filterOutcome"),
          ]),
      )
      .execute();

    await kysely
      .updateTable("NodeEntry as ne")
      .set({ status: "PROCESSED" })
      .from("DataChannel as dc")
      .whereRef("dc.id", "=", "ne.dataChannelId")
      .where("dc.destinationId", "=", node.id)
      .where("ne.status", "=", "PROCESSING")
      .execute();
  },
};
