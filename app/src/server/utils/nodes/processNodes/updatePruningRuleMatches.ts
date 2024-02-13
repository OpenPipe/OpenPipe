import { sql, type Expression, type SqlBool, type SelectQueryBuilder } from "kysely";

import { prisma, kysely } from "~/server/db";
import type { DB, NodeEntry } from "~/types/kysely-codegen.types";
import { escapeString, escapeLikeString } from "~/utils/pruningRules";

export const updateDatasetPruningRuleMatches = async ({
  nodeHash,
  datasetId,
  nodeEntryBaseQuery,
  pruningRuleCutoffDate,
}: {
  nodeHash: string;
  datasetId: string;
  nodeEntryBaseQuery: SelectQueryBuilder<
    DB & {
      ne: NodeEntry;
    },
    "ne",
    object
  >;
  pruningRuleCutoffDate?: Date;
}) => {
  const allPruningRules = await prisma.pruningRule.findMany({
    where: {
      datasetId,
    },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });

  const pruningRulesToUpdate = pruningRuleCutoffDate
    ? allPruningRules.filter((pr) => pr.createdAt >= pruningRuleCutoffDate)
    : [];
  const numOmittedRules = allPruningRules.length - pruningRulesToUpdate.length;

  await kysely.transaction().execute(async (trx) => {
    if (pruningRulesToUpdate.length) {
      await trx.deleteFrom("CachedProcessedNodeEntry").where("nodeHash", "=", nodeHash).execute();
      await trx
        .deleteFrom("NewPruningRuleMatch as prm")
        .where(
          "prm.pruningRuleId",
          "in",
          pruningRulesToUpdate.map((pr) => pr.id),
        )
        .execute();
    }

    for (let i = numOmittedRules; i < allPruningRules.length; i++) {
      let prunedInput = sql`CAST("dei"."messages" AS TEXT)`;

      // For each rule to update, find all the dataset entries with matching prompts, after previous rules have been applied
      for (let j = 0; j < i; j++) {
        prunedInput = sql`REPLACE(${prunedInput}, ${escapeString(
          allPruningRules[j]?.textToMatch,
        )}, '')`;
      }

      const ruleTextToMatch = escapeLikeString(allPruningRules[i]?.textToMatch);

      console.log("ruleTextToMatch", ruleTextToMatch);
      const stuff = await nodeEntryBaseQuery
        .innerJoin("DatasetEntryInput as dei", "ne.inputHash", "dei.hash")
        .selectAll("ne")
        .select(["dei.messages"])
        .execute();

      for (const row of stuff) {
        console.log("row", row.messages);
      }

      console.log("stuff", stuff);

      // Insert PruningRuleMatch entries
      await kysely
        .insertInto("NewPruningRuleMatch")
        .columns(["id", "pruningRuleId", "inputHash"])
        .expression(() =>
          nodeEntryBaseQuery
            .leftJoin("CachedProcessedNodeEntry as cpne", (join) =>
              join
                .onRef("cpne.incomingDEIHash", "=", "ne.inputHash")
                .on("cpne.nodeHash", "=", nodeHash),
            )
            .where("cpne.id", "is", null)
            .innerJoin("DatasetEntryInput as dei", "ne.inputHash", "dei.hash")
            .where((eb) => {
              const andArr: Expression<SqlBool>[] = [
                sql`${prunedInput} LIKE ${"%" + ruleTextToMatch + "%"}`,
              ];
              return eb.and(andArr);
            })
            .select(() => [
              sql`uuid_generate_v4()`.as("id"),
              sql`${allPruningRules[i]?.id}`.as("pruningRuleId"),
              "ne.inputHash as inputHash",
            ]),
        )
        .onConflict((oc) => oc.columns(["pruningRuleId", "inputHash"]).doNothing())
        .execute();
    }

    // Mark all relevant node data as processed
    await trx
      .insertInto("CachedProcessedNodeEntry")
      .columns(["id", "nodeHash", "incomingDEIHash", "updatedAt"])
      .expression(() =>
        nodeEntryBaseQuery.select((eb) => [
          sql`uuid_generate_v4()`.as("id"),
          sql`${nodeHash}`.as("nodeHash"),
          "ne.inputHash as incomingDEIHash",
          eb.val(new Date()).as("updatedAt"),
        ]),
      )
      .onConflict((oc) =>
        oc
          .columns(["nodeHash", "incomingDEIHash", "nodeEntryPersistentId", "incomingDEOHash"])
          .doNothing(),
      )
      .execute();
  });
};

export const copyPruningRulesForFineTune = async (fineTuneId: string, pruningRuleIds: string[]) => {
  const fineTune = await prisma.fineTune.findUniqueOrThrow({
    where: {
      id: fineTuneId,
    },
    include: {
      dataset: {
        include: {
          pruningRules: true,
        },
      },
    },
  });
  // Copy relevant pruning rules from dataset
  await prisma.$transaction(
    fineTune.dataset.pruningRules
      .filter((rule) => pruningRuleIds.includes(rule.id))
      .map((rule) =>
        prisma.pruningRule.create({
          data: {
            fineTuneId: fineTune.id,
            textToMatch: rule.textToMatch,
            tokensInText: rule.tokensInText,
            createdAt: rule.createdAt,
          },
        }),
      ),
  );
};

export const insertTrainingDataPruningRuleMatches = async (fineTuneId: string) => {
  const pruningRules = await prisma.pruningRule.findMany({
    where: {
      fineTuneId,
    },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });

  await prisma.newPruningRuleMatch.deleteMany({
    where: {
      pruningRuleId: {
        in: pruningRules.map((pr) => pr.id),
      },
    },
  });

  for (let i = 0; i < pruningRules.length; i++) {
    let prunedInput = sql`CAST("dei"."messages" AS TEXT)`;

    // For each rule to update, find all the dataset entries with matching prompts, after previous rules have been applied
    for (let j = 0; j < i; j++) {
      prunedInput = sql`REPLACE(${prunedInput}, ${escapeString(pruningRules[j]?.textToMatch)}, '')`;
    }

    const ruleTextToMatch = escapeLikeString(pruningRules[i]?.textToMatch);

    // Insert PruningRuleMatch entries
    await kysely
      .insertInto("NewPruningRuleMatch")
      .columns(["id", "pruningRuleId", "inputHash"])
      .expression((eb) =>
        eb
          .selectFrom("NewFineTuneTrainingEntry as ftte")
          .where("ftte.fineTuneId", "=", fineTuneId)
          .innerJoin("DatasetEntryInput as dei", "dei.hash", "ftte.inputHash")
          .where(sql`${prunedInput} LIKE ${"%" + ruleTextToMatch + "%"}`)
          .select(() => [
            sql`uuid_generate_v4()`.as("id"),
            sql`${pruningRules[i]?.id}`.as("pruningRuleId"),
            "ftte.inputHash as inputHash",
          ]),
      )
      .execute();
  }
};