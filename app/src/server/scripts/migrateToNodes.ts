import { type JsonValue } from "type-fest";
import { v4 as uuidv4 } from "uuid";
import { sql } from "kysely";
import yargs from "yargs";

import { kysely, prisma } from "../db";
import {
  hashAndSaveDatasetEntryInput,
  hashAndSaveDatasetEntryOutput,
} from "../utils/nodes/hashNode";
import {
  prepareIntegratedDatasetCreation,
  prepareIntegratedArchiveCreation,
} from "../utils/nodes/nodeCreation/prepareIntegratedNodesCreation";
import { generatePersistentId } from "../utils/nodes/utils";
import { enqueueProcessNode } from "../tasks/nodes/processNodes/processNode.task";
import { hideBin } from "yargs/helpers";
import { enqueueCountDatasetEntryTokens } from "../tasks/fineTuning/countDatasetEntryTokens.task";
import { RelabelOption } from "../utils/nodes/node.types";

const validateDate = (dateStr: string) => {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  return regex.test(dateStr);
};

const argv = await yargs(hideBin(process.argv))
  .option("projectId", {
    type: "string",
    description: "The id of the project to migrate",
    demandOption: true,
  })
  .option("startDate", {
    type: "string",
    description: "The starting date for the migration (format YYYY-MM-DD)",
    demandOption: false,
  })
  .option("endDate", {
    type: "string",
    description: "The ending date for the migration (format YYYY-MM-DD)",
    demandOption: false,
  })
  .option("skipProjectIds", {
    type: "string",
    description: "project ids to skip, separated by commas",
    default: "",
  }).argv;

const projectId = argv.projectId;
const skipProjectIds = argv.skipProjectIds.split(",");
const startDate = argv.startDate;
const endDate = argv.endDate;

if (startDate && !validateDate(startDate)) {
  throw new Error("Invalid startDate format. Please use YYYY-MM-DD.");
}

if (endDate && !validateDate(endDate)) {
  throw new Error("Invalid endDate format. Please use YYYY-MM-DD.");
}

let datasetsQuery = kysely
  .selectFrom("Dataset")
  .where("nodeId", "is", null)
  .selectAll("Dataset")
  .orderBy("createdAt", "desc");

if (projectId !== "all") {
  datasetsQuery = datasetsQuery.where("projectId", "=", projectId);
}

if (skipProjectIds[0]) {
  datasetsQuery = datasetsQuery.where("projectId", "not in", skipProjectIds);
}

if (startDate) {
  datasetsQuery = datasetsQuery.where("createdAt", ">=", new Date(startDate));
}

if (endDate) {
  datasetsQuery = datasetsQuery.where("createdAt", "<", new Date(endDate));
}

const datasets = await datasetsQuery.execute();

console.log("found datasets", datasets.length);

for (let i = 0; i < datasets.length; i++) {
  const creationTime = new Date();

  const dataset = datasets[i]!;
  console.log(`migrating dataset ${i + 1}/${datasets.length}: ${dataset.name}`);

  const integratedDatasetCreation = prepareIntegratedDatasetCreation({
    projectId: dataset.projectId,
    datasetName: dataset.name,
  });

  const entriesInDataset = await prisma.datasetEntry.count({
    where: { datasetId: dataset.id },
  });

  const archiveCreation = prepareIntegratedArchiveCreation({
    projectId: dataset.projectId,
    name: `Migrated entries for ${dataset.name}`,
    maxOutputSize: entriesInDataset,
    relabelLLM: RelabelOption.SkipRelabel,
  });

  await prisma.$transaction([
    ...integratedDatasetCreation.prismaCreations,
    prisma.dataset.delete({
      where: { id: integratedDatasetCreation.datasetId },
    }),
    ...archiveCreation.prismaCreations,
    prisma.dataChannel.create({
      data: {
        originId: archiveCreation.relabeledOutputId,
        destinationId: integratedDatasetCreation.manualRelabelNodeId,
      },
    }),
  ]);

  let offset = 0;
  while (true) {
    const startTime = Date.now();
    let hashingTime = 0;
    let pruningRulesTime = 0;
    let fineTuneTrainingEntriesTime = 0;
    let fineTuneTestingEntriesTime = 0;
    let savingResultsTime = 0;
    const entries = await kysely
      .selectFrom("DatasetEntry as de")
      .where("de.datasetId", "=", dataset.id)
      .limit(1000)
      .leftJoin("LoggedCall as lc", "lc.id", "de.loggedCallId")
      .where((eb) => eb.or([eb("lc.id", "is not", null), eb("de.loggedCallId", "is", null)]))
      .offset(offset)
      .selectAll("de")
      .execute();

    console.log(`fetched ${entries.length} entries in ${Date.now() - startTime}ms`);

    if (entries.length === 0) break;

    await kysely.transaction().execute(async (trx) => {
      for (let i = 0; i < entries.length; i++) {
        const entry = entries[i]!;

        const hashStartTime = Date.now();

        const inputHash = await hashAndSaveDatasetEntryInput({
          projectId: dataset.projectId,
          tool_choice: entry.tool_choice as string,
          tools: entry.tools as object[],
          messages: entry.messages as JsonValue,
          response_format: entry.response_format as JsonValue,
          trx,
        });

        const outputHash = await hashAndSaveDatasetEntryOutput({
          projectId: dataset.projectId,
          output: entry.output as object,
          trx,
        });

        hashingTime += Date.now() - hashStartTime;

        const persistentId = generatePersistentId({
          creationTime,
          key: (offset + i).toString(),
          nodeId: archiveCreation.archiveNodeId,
        });

        await trx
          .insertInto("NodeEntry")
          .values({
            id: uuidv4(),
            nodeId: archiveCreation.archiveNodeId,
            dataChannelId: archiveCreation.archiveInputChannelId,
            persistentId,
            loggedCallId: entry.loggedCallId,
            inputHash,
            outputHash,
            originalOutputHash: outputHash,
            split: entry.split,
            updatedAt: new Date(),
          })
          .execute();

        const pruningRulesStartTime = Date.now();

        await trx
          .insertInto("NewPruningRuleMatch")
          .columns(["id", "pruningRuleId", "inputHash"])
          .expression((eb) =>
            eb
              .selectFrom("PruningRuleMatch")
              .where("datasetEntryId", "=", entry.id)
              .select((eb) => [
                sql`uuid_generate_v4()`.as("id"),
                "pruningRuleId",
                eb.val(inputHash).as("inputHash"),
              ]),
          )
          .onConflict((oc) => oc.columns(["pruningRuleId", "inputHash"]).doNothing())
          .execute();

        pruningRulesTime += Date.now() - pruningRulesStartTime;

        const fineTuneTrainingEntriesStartTime = Date.now();

        await trx
          .insertInto("NewFineTuneTrainingEntry")
          .columns([
            "id",
            "prunedInputTokens",
            "outputTokens",
            "persistentId",
            "inputHash",
            "outputHash",
            "fineTuneId",
            "updatedAt",
          ])
          .expression((eb) =>
            eb
              .selectFrom("FineTuneTrainingEntry")
              .where("datasetEntryId", "=", entry.id)
              .select((eb) => [
                sql`uuid_generate_v4()`.as("id"),
                "prunedInputTokens",
                "outputTokens",
                eb.val(persistentId).as("persistentId"),
                eb.val(inputHash).as("inputHash"),
                eb.val(outputHash).as("outputHash"),
                "fineTuneId",
                sql`now()`.as("updatedAt"),
              ]),
          )
          .execute();

        fineTuneTrainingEntriesTime += Date.now() - fineTuneTrainingEntriesStartTime;

        const fineTuneTestingEntriesStartTime = Date.now();

        const fineTuneTestingEntries = await trx
          .selectFrom("FineTuneTestingEntry")
          .where("datasetEntryId", "=", entry.id)
          .selectAll("FineTuneTestingEntry")
          .execute();

        for (const fineTuneTestingEntry of fineTuneTestingEntries) {
          const ftteOutputHash = await hashAndSaveDatasetEntryOutput({
            projectId: dataset.projectId,
            output: fineTuneTestingEntry.output as object,
            trx,
          });

          await trx
            .insertInto("NewFineTuneTestingEntry")
            .values({
              id: uuidv4(),
              prunedInputTokens: fineTuneTestingEntry.prunedInputTokens,
              finishReason: fineTuneTestingEntry.finishReason,
              errorMessage: fineTuneTestingEntry.errorMessage,
              modelId: fineTuneTestingEntry.modelId,
              fineTuneId: fineTuneTestingEntry.fineTuneId,
              inputHash,
              outputHash: ftteOutputHash,
              updatedAt: new Date(),
            })
            .onConflict((oc) => oc.columns(["modelId", "inputHash"]).doNothing())
            .execute();
        }

        fineTuneTestingEntriesTime += Date.now() - fineTuneTestingEntriesStartTime;

        const datasetEvalDatasetEntries = await trx
          .selectFrom("DatasetEvalDatasetEntry")
          .where("datasetEntryId", "=", entry.id)
          .selectAll("DatasetEvalDatasetEntry")
          .execute();

        for (const datasetEvalDatasetEntry of datasetEvalDatasetEntries) {
          const datasetEvalNodeEntryId = uuidv4();

          await trx
            .insertInto("DatasetEvalNodeEntry")
            .columns(["id", "datasetEvalId", "nodeEntryPersistentId", "updatedAt"])
            .values({
              id: datasetEvalNodeEntryId,
              datasetEvalId: datasetEvalDatasetEntry.datasetEvalId,
              nodeEntryPersistentId: persistentId,
              updatedAt: new Date(),
            })
            .execute();

          const savingResultsStartTime = Date.now();

          await trx
            .insertInto("NewDatasetEvalResult")
            .columns([
              "id",
              "score",
              "explanation",
              "errorMessage",
              "status",
              "judge",
              "nodeEntryInputHash",
              "nodeEntryOutputHash",
              "wasFirst",
              "comparisonResultId",
              "comparisonOutputSourceId",
              "datasetEvalNodeEntryId",
              "datasetEvalOutputSourceId",
              "updatedAt",
            ])
            .expression((eb) =>
              eb
                .selectFrom("DatasetEvalResult as der")
                .where("datasetEvalDatasetEntryId", "=", datasetEvalDatasetEntry.id)
                .leftJoin("NewDatasetEvalResult as existingResult", "existingResult.id", "der.id")
                .where("existingResult.id", "is", null)
                .select((eb) => [
                  "der.id",
                  "der.score",
                  "der.explanation",
                  "der.errorMessage",
                  "der.status",
                  "der.judge",
                  eb.val(inputHash).as("nodeEntryInputHash"),
                  eb.val(outputHash).as("nodeEntryOutputHash"),
                  "der.wasFirst",
                  "der.comparisonResultId",
                  "der.comparisonOutputSourceId",
                  eb.val(datasetEvalNodeEntryId).as("datasetEvalNodeEntryId"),
                  "der.datasetEvalOutputSourceId",
                  sql`now()`.as("updatedAt"),
                ]),
            )
            .onConflict((oc) =>
              oc
                .columns([
                  "datasetEvalNodeEntryId",
                  "nodeEntryInputHash",
                  "datasetEvalOutputSourceId",
                  "comparisonOutputSourceId",
                ])
                .doNothing(),
            )
            .execute();

          savingResultsTime += Date.now() - savingResultsStartTime;
        }
      }
    });

    await enqueueCountDatasetEntryTokens();

    offset += entries.length;
    console.log();
    console.log(`migrated ${offset}/${entriesInDataset} entries in ${Date.now() - startTime}ms`);
    console.log(`hashing took ${hashingTime}ms`);
    console.log(`pruning rules took ${pruningRulesTime}ms`);
    console.log(`fine tune training entries took ${fineTuneTrainingEntriesTime}ms`);
    console.log(`fine tune testing entries took ${fineTuneTestingEntriesTime}ms`);
    console.log(`saving results took ${savingResultsTime}ms`);
    console.log();
  }

  await prisma.dataset.update({
    where: { id: dataset.id },
    data: {
      nodeId: integratedDatasetCreation.datasetNodeId,
    },
  });

  // migrate dataset file uploads
  await kysely
    .updateTable("DatasetFileUpload")
    .set({ nodeId: archiveCreation.archiveNodeId })
    .where("datasetId", "=", dataset.id)
    .execute();

  await enqueueProcessNode({ nodeId: archiveCreation.archiveNodeId });
}

console.log("done");
