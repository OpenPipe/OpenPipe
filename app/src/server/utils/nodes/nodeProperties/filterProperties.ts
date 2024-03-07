import { sql } from "kysely";

import { kysely } from "~/server/db";
import { constructNodeEntryFiltersQuery } from "~/server/utils/constructNodeEntryFiltersQuery";
import { type NodeProperties } from "./nodeProperties.types";
import { filterNodeSchema } from "../node.types";

export enum FilterOutput {
  Passed = "passed",
  Failed = "failed",
}

const filterOutputBaseQuery = ({ nodeHash }: { nodeHash: string }) =>
  kysely
    .selectFrom("NodeEntry as ne")
    .where("ne.status", "=", "PROCESSED")
    .innerJoin("CachedProcessedEntry as cpe", (join) =>
      join
        .on("cpe.nodeHash", "=", nodeHash)
        .onRef("cpe.incomingInputHash", "=", "ne.inputHash")
        .onRef("cpe.incomingOutputHash", "=", "ne.outputHash"),
    );

export const filterProperties: NodeProperties<"Filter"> = {
  schema: filterNodeSchema,
  cacheMatchFields: ["incomingInputHash", "incomingOutputHash"],
  cacheWriteFields: ["filterOutcome", "explanation"],
  readBatchSize: 10000,
  outputs: [
    {
      label: FilterOutput.Passed,
      selectionExpression: ({ nodeHash }) =>
        filterOutputBaseQuery({ nodeHash }).where("cpe.filterOutcome", "=", FilterOutput.Passed),
    },
    {
      label: FilterOutput.Failed,
      selectionExpression: ({ nodeHash }) =>
        filterOutputBaseQuery({ nodeHash }).where("cpe.filterOutcome", "=", FilterOutput.Failed),
    },
  ],
  hashableFields: (node) => ({ filters: node.config.filters }),
  getConcurrency: () => 2,
  beforeProcessing: async (node) => {
    const { filters } = node.config;

    await kysely
      .updateTable("NodeEntry as ne")
      .set({ status: "PROCESSING" })
      .from("DataChannel as dc")
      .where("dc.destinationId", "=", node.id)
      .whereRef("ne.dataChannelId", "=", "dc.id")
      .where("ne.status", "=", "PENDING")
      .execute();

    await kysely
      .insertInto("CachedProcessedEntry")
      .columns([
        "id",
        "projectId",
        "nodeHash",
        "incomingInputHash",
        "incomingOutputHash",
        "filterOutcome",
        "updatedAt",
      ])
      .expression(() =>
        constructNodeEntryFiltersQuery({
          filters,
          nodeId: node.id,
        })
          .where("ne.status", "=", "PROCESSING")
          .select((eb) => [
            sql`uuid_generate_v4()`.as("id"),
            eb.val(node.projectId).as("projectId"),
            eb.val(node.hash).as("nodeHash"),
            "ne.inputHash",
            "ne.outputHash",
            eb.val(FilterOutput.Passed).as("filterOutcome"),
            eb.val(new Date()).as("updatedAt"),
          ]),
      )
      .execute();

    await kysely
      .insertInto("CachedProcessedEntry")
      .columns([
        "id",
        "projectId",
        "nodeHash",
        "incomingInputHash",
        "incomingOutputHash",
        "filterOutcome",
        "updatedAt",
      ])
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
            sql`uuid_generate_v4()`.as("id"),
            eb.val(node.projectId).as("projectId"),
            eb.val(node.hash).as("nodeHash"),
            "ne.inputHash",
            "ne.outputHash",
            eb.val(FilterOutput.Failed).as("filterOutcome"),
            eb.val(new Date()).as("updatedAt"),
          ]),
      )
      .execute();

    await kysely
      .updateTable("NodeEntry as ne")
      .set({ status: "PROCESSED" })
      .from("DataChannel as dc")
      .where("dc.destinationId", "=", node.id)
      .whereRef("ne.dataChannelId", "=", "dc.id")
      .where("ne.status", "=", "PROCESSING")
      .execute();
  },
};
