import { sql } from "kysely";
import { type Prisma } from "@prisma/client";

import { kysely, prisma } from "../db";
import { getStringsToPrune, pruneInputMessages } from "~/utils/pruningRules";
import { countLlamaInputTokens, countOpenAIChatTokens } from "~/utils/countTokens";
import { typedDatasetEntry, typedFineTune } from "~/types/dbColumns.types";
import { calculateCost } from "../fineTuningProviders/supportedModels";
import { calculateNumEpochs } from "../fineTuningProviders/openpipe/trainingConfig";

console.log("Backfilling training usage logs");

const fineTunesToBackfill = await kysely
  .selectFrom("FineTune as ft")
  // only backfill fineTunes that don't have training usage logs
  .where("ft.status", "=", "DEPLOYED")
  .innerJoin("FineTuneTrainingEntry as ftte", "ftte.fineTuneId", "ft.id")
  .where("ftte.prunedInputTokens", "is", null)
  .select([
    "ft.id",
    "ft.projectId",
    "ft.provider",
    "ft.baseModel",
    "ft.createdAt",
    sql<number>`count(ftte.id)::int`.as("numTrainingEntries"),
  ])
  .groupBy("ft.id")
  .orderBy("ft.createdAt", "desc")
  .execute();

const numTrainingEntriesToBackfill = fineTunesToBackfill.reduce(
  (sum, ft) => sum + (ft?.numTrainingEntries ?? 0),
  0,
);

console.log(
  `Found fineTunes to backfill: ${fineTunesToBackfill.length} (${numTrainingEntriesToBackfill} training entries)`,
);

for (let i = 0; i < fineTunesToBackfill.length; i++) {
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const typedFT = typedFineTune(fineTunesToBackfill[i]!);
  console.log(
    new Date(),
    `Backfilling fineTune (${i + 1}/${fineTunesToBackfill.length}):${typedFT.provider}:${
      typedFT.id
    }:${typedFT.numTrainingEntries} entries`,
  );
  const stringsToPrune = await getStringsToPrune(typedFT.id);
  const isOpenAi = typedFT.provider === "openai";

  // process one batch of 1000 training entries at a time
  while (true) {
    const rows = await kysely
      .selectFrom("FineTuneTrainingEntry as ftte")
      .where("ftte.fineTuneId", "=", typedFT.id)
      .where("ftte.prunedInputTokens", "is", null)
      .innerJoin("DatasetEntry as de", "ftte.datasetEntryId", "de.id")
      .select(() => [
        "ftte.id",
        "de.messages",
        "de.tool_choice",
        "de.tools",
        "de.output",
        "de.inputTokens as originalInputTokens",
        "de.outputTokens as originalOutputTokens",
      ])
      .limit(1000)
      .orderBy("ftte.createdAt", "desc")
      .execute();
    console.log("rows", rows.length);
    if (rows.length === 0) break;

    const updateStartTime = Date.now();
    const entryUpdates: Prisma.FineTuneTrainingEntryUpdateArgs[] = [];
    for (const row of rows) {
      // For our purposes, this entry is a dataset entry
      const typedDE = typedDatasetEntry(row);

      let prunedInputTokens: number;
      let outputTokens: number | null;

      if (typedDE.messages?.length && typedDE.output) {
        const prunedInputMessages = stringsToPrune?.length
          ? pruneInputMessages(typedDE.messages, stringsToPrune)
          : typedDE.messages;

        if (isOpenAi) {
          prunedInputTokens = countOpenAIChatTokens("gpt-3.5-turbo-0613", prunedInputMessages);
        } else if (stringsToPrune?.length) {
          prunedInputTokens = countLlamaInputTokens({
            messages: prunedInputMessages,
            tool_choice: typedDE.tool_choice,
            tools: typedDE.tools,
          });
        } else {
          prunedInputTokens = typedDE.originalInputTokens ?? 0;
        }

        outputTokens = isOpenAi
          ? countOpenAIChatTokens("gpt-3.5-turbo-0613", typedDE.output ? [typedDE.output] : [])
          : typedDE.originalOutputTokens;
      } else {
        prunedInputTokens = 0;
        outputTokens = 0;
      }

      entryUpdates.push({
        where: { id: row.id },
        data: {
          prunedInputTokens,
          outputTokens,
        },
      });
    }
    const saveStartTime = Date.now();
    await prisma.$transaction(
      entryUpdates.map((update) => prisma.fineTuneTrainingEntry.update(update)),
    );
    console.log(
      `Updated ${rows.length} entries in ${Date.now() - updateStartTime}ms (save took ${
        Date.now() - saveStartTime
      }ms)`,
    );
  }

  if (!isOpenAi) {
    const trainingStats = await kysely
      .selectFrom("FineTuneTrainingEntry as ftte")
      .where("ftte.fineTuneId", "=", typedFT.id)
      .select(() => [
        sql<number>`count(ftte.id)::int`.as("numTrainingEntries"),
        sql<number>`sum(ftte."prunedInputTokens")::int`.as("totalInputTokens"),
        sql<number>`sum(ftte."outputTokens")::int`.as("totalOutputTokens"),
      ])
      .executeTakeFirst();

    const numTrainingEntries = trainingStats?.numTrainingEntries ?? 0;
    const numEpochs = calculateNumEpochs(numTrainingEntries);

    const totalInputTokens = (trainingStats?.totalInputTokens ?? 0) * numEpochs;
    const totalOutputTokens = (trainingStats?.totalOutputTokens ?? 0) * numEpochs;

    const { cost, inputCost, outputCost } = calculateCost(
      typedFT,
      totalInputTokens + totalOutputTokens,
      0,
      0,
    );

    await prisma.usageLog.create({
      data: {
        fineTuneId: typedFT.id,
        projectId: typedFT.projectId,
        baseModel: typedFT.baseModel,
        type: "TRAINING",
        inputTokens: totalInputTokens,
        outputTokens: totalOutputTokens,
        cost,
        inputCost,
        outputCost,
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        createdAt: typedFT.createdAt,
      },
    });

    await prisma.fineTune.update({
      where: { id: typedFT.id },
      data: {
        numEpochs,
      },
    });
  }
}

console.log("Done!");
