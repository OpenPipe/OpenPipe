import { sql, type RawBuilder } from "kysely";

import { prisma, kysely } from "~/server/db";

export const updatePruningRuleMatches = async (datasetId: string, createdAtCutoff: Date) => {
  const allPruningRules = await prisma.pruningRule.findMany({
    where: {
      datasetId,
    },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });

  const pruningRulesToUpdate = allPruningRules.filter((pr) => pr.createdAt >= createdAtCutoff);
  const numOmittedRules = allPruningRules.length - pruningRulesToUpdate.length;

  await prisma.pruningRuleMatch.deleteMany({
    where: {
      pruningRuleId: {
        in: pruningRulesToUpdate.map((pr) => pr.id),
      },
    },
  });

  for (let i = numOmittedRules; i < allPruningRules.length; i++) {
    let prunedInput: RawBuilder<string> = sql`CAST("DatasetEntry"."input" AS TEXT)`;

    // For each rule to update, find all the dataset entries with matching prompts, after previous rules have been applied
    for (let j = 0; j < i; j++) {
      prunedInput = sql`REPLACE(${prunedInput}, ${escapeReplaceString(
        allPruningRules[j]?.textToMatch,
      )}, '')`;
    }

    const ruleTextToMatch = escapeLikeString(allPruningRules[i]?.textToMatch);

    // Insert PruningRuleMatch entries based on a select statement
    await kysely
      .insertInto("PruningRuleMatch")
      .columns(["id", "pruningRuleId", "datasetEntryId"])
      .expression((eb) =>
        eb
          .selectFrom("DatasetEntry")
          .where((eb) =>
            eb.and([
              eb(`DatasetEntry.datasetId`, "=", datasetId),
              sql`${prunedInput} LIKE ${"%" + ruleTextToMatch + "%"}`,
            ]),
          )
          .select(() => [
            sql`uuid_generate_v4()`.as("id"),
            sql`${allPruningRules[i]?.id}`.as("pruningRuleId"),
            "DatasetEntry.id as datasetEntryId",
          ]),
      )
      .execute();
  }
};

function escapeReplaceString(input: string | undefined) {
  return (input || "").replaceAll("\\", "\\").replaceAll("\n", "\\n").replaceAll('"', '\\"');
}

function escapeLikeString(input: string | undefined) {
  return (input || "").replaceAll("\\", "\\\\").replaceAll("\n", "\\\\n").replaceAll('"', '\\\\"');
}
