import { sql, type Expression, type SqlBool, type SelectQueryBuilder } from "kysely";

import { prisma, kysely } from "~/server/db";
import type { DB, NodeEntry } from "~/types/kysely-codegen.types";
import { escapeString, escapeLikeString } from "~/utils/pruningRules";

export const updateDatasetPruningRuleMatches = async ({
  nodeHash,
  datasetId,
  nodeEntryBaseQuery,
  pruningRuleCutoffDate = new Date(0),
  deleteMatches,
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
  deleteMatches?: boolean;
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
    if (deleteMatches) {
      await trx.deleteFrom("PruningRulesChecked").where("nodeHash", "=", nodeHash).execute();
      if (pruningRulesToUpdate.length > 0) {
        await trx
          .deleteFrom("PruningRuleMatch as prm")
          .where(
            "prm.pruningRuleId",
            "in",
            pruningRulesToUpdate.map((pr) => pr.id),
          )
          .execute();
      }
    }

    for (let i = numOmittedRules; i < allPruningRules.length; i++) {
      let prunedInput = sql`CAST("dei"."messages" AS TEXT)`;
      const currentPruningRule = allPruningRules[i];

      if (!currentPruningRule) continue;

      // For each rule to update, find all the dataset entries with matching prompts, after previous rules have been applied
      for (let j = 0; j < i; j++) {
        prunedInput = sql`REPLACE(${prunedInput}, ${escapeString(
          allPruningRules[j]?.textToMatch,
        )}, '')`;
      }

      const ruleTextToMatch = escapeLikeString(currentPruningRule.textToMatch);

      // Insert PruningRuleMatch entries
      await trx
        .insertInto("PruningRuleMatch")
        .columns(["id", "pruningRuleId", "inputHash"])
        .expression(() =>
          nodeEntryBaseQuery
            .leftJoin("PruningRulesChecked as prc", (join) =>
              join
                .onRef("prc.incomingInputHash", "=", "ne.inputHash")
                .on("prc.nodeHash", "=", nodeHash),
            )
            .where("prc.nodeHash", "is", null)
            .innerJoin("DatasetEntryInput as dei", "ne.inputHash", "dei.hash")
            .where((eb) => {
              const andArr: Expression<SqlBool>[] = [
                sql`${prunedInput} LIKE ${"%" + ruleTextToMatch + "%"}`,
              ];
              return eb.and(andArr);
            })
            .select((eb) => [
              sql`uuid_generate_v4()`.as("id"),
              eb.val(currentPruningRule.id).as("pruningRuleId"),
              "ne.inputHash as inputHash",
            ]),
        )
        .onConflict((oc) => oc.columns(["pruningRuleId", "inputHash"]).doNothing())
        .execute();
    }

    // Mark all relevant node data as processed
    await trx
      .insertInto("PruningRulesChecked")
      .columns(["nodeHash", "incomingInputHash"])
      .expression(() =>
        nodeEntryBaseQuery.select([
          sql`${nodeHash}`.as("nodeHash"),
          "ne.inputHash as incomingInputHash",
        ]),
      )
      .onConflict((oc) => oc.columns(["nodeHash", "incomingInputHash"]).doNothing())
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

  await prisma.pruningRuleMatch.deleteMany({
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
      .insertInto("PruningRuleMatch")
      .columns(["id", "pruningRuleId", "inputHash"])
      .expression((eb) =>
        eb
          .selectFrom("FineTuneTrainingEntry as ftte")
          .where("ftte.fineTuneId", "=", fineTuneId)
          .innerJoin("DatasetEntryInput as dei", "dei.hash", "ftte.inputHash")
          .where(sql`${prunedInput} LIKE ${"%" + ruleTextToMatch + "%"}`)
          .select(() => [
            sql`uuid_generate_v4()`.as("id"),
            sql`${pruningRules[i]?.id}`.as("pruningRuleId"),
            "ftte.inputHash as inputHash",
          ]),
      )
      .onConflict((oc) => oc.columns(["pruningRuleId", "inputHash"]).doNothing())
      .execute();
  }
};
