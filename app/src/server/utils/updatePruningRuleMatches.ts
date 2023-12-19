import { sql, type Expression, type SqlBool } from "kysely";

import { prisma, kysely } from "~/server/db";
import { escapeString, escapeLikeString } from "~/utils/pruningRules";

export const updatePruningRuleMatches = async (
  datasetId: string,
  createdAtCutoff: Date,
  datasetEntryIds?: string[],
) => {
  const allPruningRules = await prisma.pruningRule.findMany({
    where: {
      datasetId,
    },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });

  // If there are more than 1000 dataset entries, the IN operator will be inefficient or fail
  if (datasetEntryIds && datasetEntryIds.length > 1000) datasetEntryIds = undefined;

  const pruningRulesToUpdate = allPruningRules.filter((pr) => pr.createdAt >= createdAtCutoff);
  const numOmittedRules = allPruningRules.length - pruningRulesToUpdate.length;

  await prisma.pruningRuleMatch.deleteMany({
    where: {
      AND: [
        {
          pruningRuleId: {
            in: pruningRulesToUpdate.map((pr) => pr.id),
          },
        },
        {
          datasetEntryId: {
            in: datasetEntryIds,
          },
        },
      ],
    },
  });

  for (let i = numOmittedRules; i < allPruningRules.length; i++) {
    let prunedInput = sql`CAST("DatasetEntry"."messages" AS TEXT)`;

    // For each rule to update, find all the dataset entries with matching prompts, after previous rules have been applied
    for (let j = 0; j < i; j++) {
      prunedInput = sql`REPLACE(${prunedInput}, ${escapeString(
        allPruningRules[j]?.textToMatch,
      )}, '')`;
    }

    const ruleTextToMatch = escapeLikeString(allPruningRules[i]?.textToMatch);

    // Insert PruningRuleMatch entries
    await kysely
      .insertInto("PruningRuleMatch")
      .columns(["id", "pruningRuleId", "datasetEntryId"])
      .expression((eb) =>
        eb
          .selectFrom("DatasetEntry")
          .where((eb) => {
            const andArr: Expression<SqlBool>[] = [
              eb(`DatasetEntry.datasetId`, "=", datasetId),
              sql`${prunedInput} LIKE ${"%" + ruleTextToMatch + "%"}`,
            ];
            if (datasetEntryIds) {
              andArr.unshift(eb(`DatasetEntry.id`, "in", datasetEntryIds));
            }
            return eb.and(andArr);
          })
          .select(() => [
            sql`uuid_generate_v4()`.as("id"),
            sql`${allPruningRules[i]?.id}`.as("pruningRuleId"),
            "DatasetEntry.id as datasetEntryId",
          ]),
      )
      .execute();
  }
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
    let prunedInput = sql`CAST("DatasetEntry"."messages" AS TEXT)`;

    // For each rule to update, find all the dataset entries with matching prompts, after previous rules have been applied
    for (let j = 0; j < i; j++) {
      prunedInput = sql`REPLACE(${prunedInput}, ${escapeString(pruningRules[j]?.textToMatch)}, '')`;
    }

    const ruleTextToMatch = escapeLikeString(pruningRules[i]?.textToMatch);

    // Insert PruningRuleMatch entries
    await kysely
      .insertInto("PruningRuleMatch")
      .columns(["id", "pruningRuleId", "datasetEntryId"])
      .expression((eb) =>
        eb
          .selectFrom("FineTuneTrainingEntry")
          .where("FineTuneTrainingEntry.fineTuneId", "=", fineTuneId)
          .innerJoin("DatasetEntry", "FineTuneTrainingEntry.datasetEntryId", "DatasetEntry.id")
          .where("DatasetEntry.outdated", "=", false)
          .where(sql`${prunedInput} LIKE ${"%" + ruleTextToMatch + "%"}`)
          .select(() => [
            sql`uuid_generate_v4()`.as("id"),
            sql`${pruningRules[i]?.id}`.as("pruningRuleId"),
            "DatasetEntry.id as datasetEntryId",
          ]),
      )
      .execute();
  }
};
