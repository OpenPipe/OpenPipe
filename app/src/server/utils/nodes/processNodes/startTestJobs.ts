import { type SelectQueryBuilder } from "kysely";
import { jsonArrayFrom } from "kysely/helpers/postgres";
import { shuffle } from "lodash-es";
import { kysely } from "~/server/db";
import { type EvalKey, evaluateTestSetEntries } from "~/server/tasks/evaluateTestSetEntries.task";
import { generateTestSetEntry } from "~/server/tasks/generateTestSetEntry.task";

import type { DB, NodeEntry } from "~/types/kysely-codegen.types";

type NodeEntryBaseQuery = SelectQueryBuilder<
  DB & {
    ne: NodeEntry;
  },
  "ne",
  object
>;

export const startDatasetTestJobs = async ({
  datasetId,
  nodeEntryBaseQuery,
}: {
  datasetId: string;
  nodeEntryBaseQuery: NodeEntryBaseQuery;
}) => {
  const dataset = await kysely
    .selectFrom("Dataset as d")
    .where("d.id", "=", datasetId)
    .select((eb) => [
      jsonArrayFrom(
        eb.selectFrom("DatasetEval as de").where("de.datasetId", "=", datasetId).select(["de.id"]),
      ).as("evaluations"),
      jsonArrayFrom(
        eb.selectFrom("FineTune as ft").where("ft.datasetId", "=", datasetId).select(["ft.id"]),
      ).as("fineTunes"),
      "d.enabledComparisonModels",
    ])
    .executeTakeFirst();

  if (!dataset) return;

  for (const evaluation of dataset.evaluations) {
    await startTestJobsForEval({
      datasetEvalId: evaluation.id,
      nodeEntryBaseQuery,
    });
  }

  const modelIds = dataset.fineTunes
    .map((ft) => ft.id)
    .concat(dataset.enabledComparisonModels ?? []);

  for (const modelId of modelIds) {
    await startTestJobsForModel({
      modelId,
      nodeEntryBaseQuery,
    });
  }
};

export const startTestJobsForEval = async ({
  datasetEvalId,
  nodeEntryBaseQuery,
}: {
  datasetEvalId: string;
  nodeEntryBaseQuery: NodeEntryBaseQuery;
}) => {
  const datasetEval = await kysely
    .selectFrom("DatasetEval as eval")
    .where("eval.id", "=", datasetEvalId)
    .select((eb) => [
      jsonArrayFrom(
        nodeEntryBaseQuery
          .where("ne.split", "=", "TEST")
          .innerJoin(
            "DatasetEvalNodeEntry as dene",
            "dene.nodeEntryPersistentId",
            "ne.persistentId",
          )
          .select(["ne.id as nodeEntryId", "dene.id", "dene.datasetEvalId"])
          .where("datasetEvalId", "=", datasetEvalId),
      ).as("datasetEvalDatasetEntries"),
      jsonArrayFrom(
        eb
          .selectFrom("DatasetEvalOutputSource")
          .select(["id", "modelId", "datasetEvalId"])
          .where("datasetEvalId", "=", datasetEvalId),
      ).as("outputSources"),
    ])
    .executeTakeFirst();

  if (!datasetEval) return;

  const evalsToRun: EvalKey[] = [];

  for (const datasetEvalNodeEntry of datasetEval.datasetEvalDatasetEntries) {
    for (let i = 0; i < datasetEval.outputSources.length; i++) {
      for (let j = i + 1; j < datasetEval.outputSources.length; j++) {
        evalsToRun.push({
          nodeEntryId: datasetEvalNodeEntry.nodeEntryId,
          firstOutputSourceId: datasetEval.outputSources[i]?.id as string,
          secondOutputSourceId: datasetEval.outputSources[j]?.id as string,
        });
      }
    }
  }

  // Shuffle so all models get results run at roughly the same rate
  const shuffledEvalsToRun = shuffle(evalsToRun);

  for (const evalKey of shuffledEvalsToRun) {
    await evaluateTestSetEntries.enqueue(evalKey);
  }
};

export const startTestJobsForModel = async ({
  modelId,
  nodeEntryBaseQuery,
}: {
  modelId: string;
  nodeEntryBaseQuery: NodeEntryBaseQuery;
}) => {
  const nodeEntryToRun = await nodeEntryBaseQuery
    .where("ne.split", "=", "TEST")
    .leftJoin("NewFineTuneTestingEntry as ftte", (join) =>
      join.onRef("ftte.inputHash", "=", "ne.inputHash").on("ftte.modelId", "=", modelId),
    )
    .where("ftte.id", "is", null)
    .select(["ne.id as nodeEntryId"])
    .execute();

  const jobsToRun = nodeEntryToRun.map((nodeEntry) => ({
    modelId,
    nodeEntryId: nodeEntry.nodeEntryId,
    numPreviousTries: 0,
  }));

  for (const job of jobsToRun) {
    await generateTestSetEntry.enqueue(job);
  }
};
