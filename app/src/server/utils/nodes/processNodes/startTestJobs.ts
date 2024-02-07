import { type SelectQueryBuilder } from "kysely";
import { jsonArrayFrom } from "kysely/helpers/postgres";
import { shuffle } from "lodash-es";
import { kysely } from "~/server/db";
import { type EvalKey, evaluateTestSetEntries } from "~/server/tasks/evaluateTestSetEntries.task";
import { generateTestSetEntry } from "~/server/tasks/generateTestSetEntry.task";

import type { DB, NodeData } from "~/types/kysely-codegen.types";

type NodeDataBaseQuery = SelectQueryBuilder<
  DB & {
    nd: NodeData;
  },
  "nd",
  object
>;

export const startDatasetTestJobs = async ({
  datasetId,
  nodeDataBaseQuery,
}: {
  datasetId: string;
  nodeDataBaseQuery: NodeDataBaseQuery;
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
      nodeDataBaseQuery,
    });
  }

  const modelIds = dataset.fineTunes
    .map((ft) => ft.id)
    .concat(dataset.enabledComparisonModels ?? []);

  for (const modelId of modelIds) {
    await startTestJobsForModel({
      modelId,
      nodeDataBaseQuery,
    });
  }
};

export const startTestJobsForEval = async ({
  datasetEvalId,
  nodeDataBaseQuery,
}: {
  datasetEvalId: string;
  nodeDataBaseQuery: NodeDataBaseQuery;
}) => {
  const datasetEval = await kysely
    .selectFrom("DatasetEval as eval")
    .where("eval.id", "=", datasetEvalId)
    .select((eb) => [
      jsonArrayFrom(
        nodeDataBaseQuery
          .innerJoin("DatasetEvalDatasetEntry as dede", "dede.importId", "nd.importId")
          .select(["nd.id as nodeDataId", "dede.id", "dede.datasetEvalId"])
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

  for (const datasetEvalDatasetEntry of datasetEval.datasetEvalDatasetEntries) {
    for (let i = 0; i < datasetEval.outputSources.length; i++) {
      for (let j = i + 1; j < datasetEval.outputSources.length; j++) {
        evalsToRun.push({
          nodeDataId: datasetEvalDatasetEntry.nodeDataId,
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
  nodeDataBaseQuery,
}: {
  modelId: string;
  nodeDataBaseQuery: NodeDataBaseQuery;
}) => {
  const nodeDataToRun = await nodeDataBaseQuery
    .leftJoin("FineTuneTestingEntry as ftte", (join) =>
      join.onRef("ftte.inputHash", "=", "nd.inputHash").on("ftte.modelId", "=", modelId),
    )
    .where("ftte.id", "is", null)
    .select(["nd.id as nodeDataId"])
    .execute();

  const jobsToRun = nodeDataToRun.map((nodeData) => ({
    modelId,
    nodeDataId: nodeData.nodeDataId,
    numPreviousTries: 0,
  }));

  for (const job of jobsToRun) {
    await generateTestSetEntry.enqueue(job);
  }
};
