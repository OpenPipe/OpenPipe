import { type Node } from "@prisma/client";
import { sql } from "kysely";

import { kysely } from "~/server/db";
import { nodePropertiesByType } from "./processNode.task";

export const markCachedEntriesProcessed = async ({
  node,
}: {
  node: Pick<Node, "id" | "hash" | "type">;
}) => {
  await kysely
    .updateTable("NodeEntry as ne")
    .from(() => selectEntriesWithCache({ node }).as("cachedNE"))
    .where("cachedNE.status", "=", "PENDING")
    .where("cachedNE.cacheHit", "=", true)
    .whereRef("ne.id", "=", "cachedNE.id")
    .set({
      status: "PROCESSED",
    })
    .execute();
};

export const selectEntriesWithCache = ({
  node,
  filterOutcome,
}: {
  node: Pick<Node, "id" | "hash" | "type">;
  filterOutcome?: string;
}) => {
  const nodeProperties = nodePropertiesByType[node.type];

  const baseQuery = kysely
    .selectFrom("Node as n")
    .where("n.id", "=", node.id)
    .innerJoin("DataChannel as dc", "dc.destinationId", "n.id")
    .innerJoin("NodeEntry as originalNE", "originalNE.dataChannelId", "dc.id");

  const defaultSelectQuery = baseQuery
    .selectAll("originalNE")
    .select((eb) => [
      eb.val(false).as("cacheHit"),
      eb.val(null).as("filterOutcome"),
      eb.val(null).as("explanation"),
    ]);

  if (nodeProperties.cacheMatchFields && nodeProperties.cacheWriteFields) {
    let cacheSelectQuery = baseQuery.leftJoin("CachedProcessedEntry as cpe", (join) => {
      let joinClause = join
        .on((eb) => eb.or([eb("cpe.nodeHash", "=", node.hash), eb("cpe.nodeId", "=", node.id)]))
        .onRef("cpe.incomingInputHash", "=", "originalNE.inputHash")
        .onRef("cpe.incomingOutputHash", "=", "originalNE.outputHash");

      if (nodeProperties.cacheMatchFields?.includes("nodeEntryPersistentId")) {
        joinClause = joinClause.onRef("cpe.nodeEntryPersistentId", "=", "originalNE.persistentId");
      }
      if (nodeProperties.cacheMatchFields?.includes("incomingInputHash")) {
        joinClause = joinClause.onRef("cpe.incomingInputHash", "=", "originalNE.inputHash");
      }
      if (nodeProperties.cacheMatchFields?.includes("incomingOutputHash")) {
        joinClause = joinClause.onRef("cpe.incomingOutputHash", "=", "originalNE.outputHash");
      }

      return joinClause;
    });

    if (filterOutcome) {
      cacheSelectQuery = cacheSelectQuery.where("cpe.filterOutcome", "=", filterOutcome);
    }

    const inputHashQuery = nodeProperties.cacheWriteFields.includes("outgoingInputHash")
      ? cacheSelectQuery.select([
          sql`coalesce(cpe."outgoingInputHash", "originalNE"."inputHash")`.as("inputHash"),
        ])
      : cacheSelectQuery.select(["originalNE.inputHash"]);

    const outputHashQuery = nodeProperties.cacheWriteFields.includes("outgoingOutputHash")
      ? inputHashQuery.select([
          sql`coalesce(cpe."outgoingOutputHash", "originalNE"."outputHash")`.as("outputHash"),
        ])
      : inputHashQuery.select(["originalNE.outputHash"]);

    const splitQuery = nodeProperties.cacheWriteFields.includes("outgoingSplit")
      ? outputHashQuery.select([
          sql`coalesce(cpe."outgoingSplit", "originalNE"."split")`.as("split"),
        ])
      : outputHashQuery.select(["originalNE.split"]);

    const filterOutcomeQuery = nodeProperties.cacheWriteFields.includes("filterOutcome")
      ? splitQuery.select(["cpe.filterOutcome"])
      : splitQuery.select((eb) => [eb.val(null).as("filterOutcome")]);

    const explanationQuery = nodeProperties.cacheWriteFields.includes("explanation")
      ? filterOutcomeQuery.select(["cpe.explanation"])
      : filterOutcomeQuery.select((eb) => [eb.val(null).as("explanation")]);

    return explanationQuery.select([
      "originalNE.id",
      "originalNE.persistentId",
      "originalNE.status",
      "originalNE.error",
      "originalNE.loggedCallId",
      "originalNE.originalOutputHash",
      "originalNE.dataChannelId",
      "originalNE.parentNodeEntryId",
      "originalNE.createdAt",
      "originalNE.updatedAt",
      sql`cpe."incomingInputHash" is not null`.as("cacheHit"),
    ]) as typeof defaultSelectQuery;
  } else {
    return defaultSelectQuery;
  }
};
