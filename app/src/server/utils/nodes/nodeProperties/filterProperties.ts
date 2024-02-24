import { kysely, prisma } from "~/server/db";
import { constructNodeEntryFiltersQuery } from "~/server/utils/constructNodeEntryFiltersQuery";
import { NodeProperties } from "./nodeProperties.types";
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
  beforeAll: async (node) => {
    const { filters } = node.config;

    await prisma.nodeEntry.updateMany({
      where: { nodeId: node.id, status: "PENDING" },
      data: { status: "PROCESSING" },
    });

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
          .where("ne.nodeId", "=", node.id)
          .where("ne.status", "=", "PROCESSING")
          .innerJoin("Node as n", "n.id", "ne.nodeId")
          .leftJoin("CachedProcessedEntry as cpe1", (join) =>
            join
              .onRef("cpe1.nodeHash", "=", "n.hash")
              .onRef("cpe1.incomingInputHash", "=", "ne.inputHash")
              .onRef("cpe1.incomingOutputHash", "=", "ne.outputHash"),
          )
          .where("cpe1.incomingInputHash", "is", null)
          .leftJoin("CachedProcessedEntry as cpe2", (join) =>
            join
              .onRef("cpe2.nodeId", "=", "ne.nodeId")
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

    await prisma.nodeEntry.updateMany({
      where: { nodeId: node.id, status: "PROCESSING" },
      data: { status: "PROCESSED" },
    });
  },
};
