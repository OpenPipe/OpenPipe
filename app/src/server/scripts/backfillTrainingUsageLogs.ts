import { sql } from "kysely";

import { kysely, prisma } from "../db";
import { getStringsToPrune, pruneInputMessages } from "~/utils/pruningRules";
import { countLlamaInputTokens, countOpenAIChatTokens } from "~/utils/countTokens";
import { typedDatasetEntry, typedFineTune } from "~/types/dbColumns.types";
import { calculateCost } from "../fineTuningProviders/supportedModels";

console.log("Backfilling training usage logs");

const fineTunesToBackfill = await kysely
  .selectFrom("FineTune as ft")
  // only backfill fineTunes that don't have training usage logs
  .where((eb) =>
    eb.not(
      eb.exists(
        eb
          .selectFrom("FineTuneTrainingEntry")
          .whereRef("fineTuneId", "=", "ft.id")
          .where("prunedInputTokens", "is", null),
      ),
    ),
  )
  .where("ft.status", "=", "DEPLOYED")
  .select(["ft.id", "ft.provider", "ft.baseModel", "ft.deploymentFinishedAt"])
  .execute();

console.log("Found fineTunes to backfill:", fineTunesToBackfill.length);

for (let i = 0; i < fineTunesToBackfill.length; i++) {
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const typedFT = typedFineTune(fineTunesToBackfill[i]!);
  console.log(`Backfilling fineTune (${i + 1}/${fineTunesToBackfill.length}):${typedFT.id}`);

  const stringsToPrune = await getStringsToPrune(typedFT.id);
  const isOpenAi = typedFT.baseModel.startsWith("gpt-3.5");

  // process one batch of 1000 training entries at a time
  let offset = 0;
  while (true) {
    const rows = await kysely
      .selectFrom("FineTuneTrainingEntry as ftte")
      .where("ftte.fineTuneId", "=", typedFT.id)
      .where("ftte.prunedInputTokens", "is", null)
      .innerJoin("DatasetEntry as de", "ftte.datasetEntryId", "de.id")
      .select(() => ["ftte.id", "de.messages", "de.tool_choice", "de.tools"])
      .orderBy("ftte.createdAt", "desc")
      .execute();
    if (rows.length === 0) break;

    for (const row of rows) {
      // For our purposes, this entry is a dataset entry
      const { messages, tool_choice, tools } = typedDatasetEntry(row);
      if (!messages || !tool_choice || !tools) continue;

      const prunedInputMessages = pruneInputMessages(messages, stringsToPrune);

      const prunedInputTokens = isOpenAi
        ? countOpenAIChatTokens("gpt-3.5-turbo-0613", prunedInputMessages)
        : countLlamaInputTokens({ messages: prunedInputMessages, tool_choice, tools });

      await prisma.fineTuneTrainingEntry.update({
        where: { id: row.id },
        data: {
          prunedInputTokens,
        },
      });
    }

    offset += rows.length;
  }

  if (!isOpenAi) {
    const trainingStats = await kysely
      .selectFrom("FineTuneTrainingEntry as ftte")
      .where("ftte.fineTuneId", "=", typedFT.id)
      .innerJoin("DatasetEntry as de", "ftte.datasetEntryId", "de.id")
      .select(() => [
        sql<number>`sum(ftte.prunedInputTokens)`.as("totalInputTokens"),
        sql<number>`sum(de.outputTokens)`.as("totalOutputTokens"),
      ])
      .executeTakeFirst();

    const totalInputTokens = trainingStats?.totalInputTokens ?? 0;
    const totalOutputTokens = trainingStats?.totalOutputTokens ?? 0;

    await prisma.usageLog.create({
      data: {
        fineTuneId: typedFT.id,
        inputTokens: totalInputTokens,
        outputTokens: totalOutputTokens,
        cost: calculateCost(typedFT, totalInputTokens + totalOutputTokens, 0, 0),
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        createdAt: typedFT.deploymentFinishedAt!,
      },
    });
  }
}

console.log("Done!");
