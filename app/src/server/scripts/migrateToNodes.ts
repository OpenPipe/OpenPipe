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
import { countDatasetEntryTokens } from "../tasks/fineTuning/countDatasetEntryTokens.task";
import { RelabelOption } from "../utils/nodes/node.types";

const argv = await yargs(hideBin(process.argv))
  .option("projectId", {
    type: "string",
    description: "The id of the project to migrate",
    demandOption: true,
  })
  .option("skipProjectIds", {
    type: "string",
    description: "project ids to skip, separated by commas",
    default: "",
  }).argv;

const projectId = argv.projectId;
const skipProjectIds = argv.skipProjectIds.split(",");

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

const datasets = await datasetsQuery.execute();

console.log("found datasets", datasets.length);

const creationTime = new Date();

for (let i = 0; i < datasets.length; i++) {
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
    const entries = await kysely
      .selectFrom("DatasetEntry as de")
      .where("de.datasetId", "=", dataset.id)
      .limit(1000)
      .offset(offset)
      .selectAll("de")
      .execute();

    if (entries.length === 0) break;

    await kysely.transaction().execute(async (trx) => {
      for (let i = 0; i < entries.length; i++) {
        const entry = entries[i]!;

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
                .selectFrom("DatasetEvalResult")
                .where("datasetEvalDatasetEntryId", "=", datasetEvalDatasetEntry.id)
                .select((eb) => [
                  "id",
                  "score",
                  "explanation",
                  "errorMessage",
                  "status",
                  "judge",
                  eb.val(inputHash).as("nodeEntryInputHash"),
                  eb.val(outputHash).as("nodeEntryOutputHash"),
                  "wasFirst",
                  "comparisonResultId",
                  "comparisonOutputSourceId",
                  eb.val(datasetEvalNodeEntryId).as("datasetEvalNodeEntryId"),
                  "datasetEvalOutputSourceId",
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
        }
      }
    });

    await countDatasetEntryTokens.enqueue({});

    offset += entries.length;
    console.log(`migrated ${offset}/${entriesInDataset} entries`);
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
