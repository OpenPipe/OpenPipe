import { v4 as uuidv4 } from "uuid";
import { sql } from "kysely";
import yargs from "yargs";
import { type Project } from "@prisma/client";

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
import { RelabelOption, typedDatasetEntryOutput } from "../utils/nodes/node.types";
import { typedDatasetEntry } from "~/types/dbColumns.types";

const argv = await yargs(hideBin(process.argv))
  .option("projectId", {
    type: "string",
    description: "The id of a specific project to migrate",
    demandOption: false,
  })
  .option("resetKeys", {
    type: "boolean",
    description: "Whether to reset migration keys. Set true after all workers have stopped.",
    demandOption: false,
  }).argv;

const projectId = argv.projectId;

if (argv.resetKeys) {
  // allow us to reprocess projects that we didn't complete
  await kysely.updateTable("Project").set({ migrationKey: null }).execute();
}

// random string
const processKey = Math.random().toString(36).substring(7);

while (true) {
  let project: Pick<Project, "id"> | undefined;

  await kysely.transaction().execute(async (trx) => {
    let projectsQuery = trx
      .selectFrom("Project as p")
      .innerJoin("Dataset as d", (join) =>
        join.onRef("d.projectId", "=", "p.id").on("d.nodeId", "is", null),
      )
      // order by number of datasets
      .groupBy("p.id")
      .orderBy(sql`count(d.id)`, "desc")
      .where("p.migrationKey", "is", null)
      .selectAll("p");

    if (projectId) {
      projectsQuery = projectsQuery.where("p.id", "=", projectId);
    }

    project = await projectsQuery.executeTakeFirst();

    if (!project) return;

    await trx
      .updateTable("Project")
      .set({ migrationKey: processKey })
      .where("id", "=", project.id)
      .execute();
  });

  if (!project) {
    console.log("no projects found");
    break;
  }

  const datasets = await kysely
    .selectFrom("Dataset")
    .where("nodeId", "is", null)
    .where("projectId", "=", project.id)
    .selectAll("Dataset")
    .orderBy("createdAt", "desc")
    .execute();

  console.log("found datasets", datasets.length);

  for (let i = 0; i < datasets.length; i++) {
    const creationTime = new Date();

    const dataset = datasets[i]!;

    const updatedDataset = await prisma.dataset.findUnique({
      where: { id: dataset.id },
      select: { nodeId: true },
    });

    if (!updatedDataset || updatedDataset.nodeId) {
      console.log(`skipping dataset ${i + 1}/${datasets.length}: ${dataset.name}`);
      continue;
    }

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

          const tEntry = typedDatasetEntry(entry);

          const hashStartTime = Date.now();

          const inputHash = await hashAndSaveDatasetEntryInput({
            projectId: dataset.projectId,
            tool_choice: tEntry.tool_choice ?? undefined,
            tools: tEntry.tools ?? undefined,
            messages: tEntry.messages,
            response_format: tEntry.response_format ?? undefined,
            inputTokens: tEntry.inputTokens ?? undefined,
            trx,
          });

          const outputHash = await hashAndSaveDatasetEntryOutput({
            projectId: dataset.projectId,
            output: tEntry.output,
            outputTokens: tEntry.outputTokens ?? undefined,
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
            .where("output", "is not", null)
            .selectAll("FineTuneTestingEntry")
            .execute();

          for (const fineTuneTestingEntry of fineTuneTestingEntries) {
            let ftteOutputHash;
            if (fineTuneTestingEntry.output) {
              const tFineTuneTestingEntry = typedDatasetEntryOutput(fineTuneTestingEntry);

              ftteOutputHash = await hashAndSaveDatasetEntryOutput({
                projectId: dataset.projectId,
                output: tFineTuneTestingEntry.output,
                trx,
              });
            }

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
                projectId: dataset.projectId,
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

      await enqueueCountDatasetEntryTokens({ projectId: dataset.projectId });

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
}

console.log("done");
