import { sql } from "kysely";
import { NodeEntryStatus } from "@prisma/client";

import { kysely } from "~/server/db";
import { constructNodeEntryFiltersQuery } from "~/server/utils/constructNodeEntryFiltersQuery";
import { FilterOutput, type NodeProperties } from "../nodeProperties.types";
import { filterNodeSchema } from "../../node.types";
import { getJudgement } from "./getJudgement";

export const filterProperties: NodeProperties<"Filter"> = {
  schema: filterNodeSchema,
  cacheMatchFields: ["incomingInputHash", "incomingOutputHash"],
  cacheWriteFields: ["filterOutcome", "explanation"],
  readBatchSize: 10000,
  outputs: [
    {
      label: FilterOutput.Passed,
      selectionCriteria: {
        filterOutcome: FilterOutput.Passed,
      },
    },
    {
      label: FilterOutput.Failed,
      selectionCriteria: {
        filterOutcome: FilterOutput.Failed,
      },
    },
  ],
  hashableFields: (node) =>
    node.config.mode === "SQL"
      ? {
          filters: node.config.filters,
        }
      : {
          judgementCriteria: node.config.judgementCriteria,
        },
  getConcurrency: (node) => node.config.maxLLMConcurrency,
  beforeProcessing: async (node) => {
    const { mode, filters } = node.config;

    if (mode === "LLM") return;

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
          node,
        })
          .where("ne.status", "=", "PROCESSING")
          .distinctOn(["ne.inputHash", "ne.outputHash"])
          .leftJoin("CachedProcessedEntry as cpe", (join) =>
            join
              .on((eb) =>
                eb.or([eb("cpe.nodeHash", "=", node.hash), eb("cpe.nodeId", "=", node.id)]),
              )
              .onRef("cpe.incomingInputHash", "=", "ne.inputHash")
              .onRef("cpe.incomingOutputHash", "=", "ne.outputHash"),
          )
          .where("cpe.incomingInputHash", "is", null)
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
          .distinctOn(["ne.inputHash", "ne.outputHash"])
          .leftJoin("CachedProcessedEntry as cpe", (join) =>
            join
              .on((eb) =>
                eb.or([eb("cpe.nodeHash", "=", node.hash), eb("cpe.nodeId", "=", node.id)]),
              )
              .onRef("cpe.incomingInputHash", "=", "ne.inputHash")
              .onRef("cpe.incomingOutputHash", "=", "ne.outputHash"),
          )
          .where("cpe.incomingInputHash", "is", null)
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
  shouldSkipProcessEntry: (node) => node.config.mode === "SQL",
  processEntry: async ({ node, entry }) => {
    const {
      judgementCriteria: { model, instructions },
    } = node.config;

    const { tool_choice, tools, messages, response_format, output } = entry;

    const judgementCompletion = await getJudgement({
      projectId: node.projectId,
      model,
      instructions,
      messages,
      output,
    });

    return {
      status: NodeEntryStatus.PROCESSED,
      filterOutcome: judgementCompletion.judgement,
      explanation: judgementCompletion.explanation,
    } as const;
  },
};
