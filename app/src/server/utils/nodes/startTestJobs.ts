import { type SelectQueryBuilder, sql } from "kysely";
import { jsonArrayFrom } from "kysely/helpers/postgres";
import { shuffle } from "lodash-es";
import type { ComparisonModel, Prisma } from "@prisma/client";
import { v4 as uuidv4 } from "uuid";

import { kysely, prisma } from "~/server/db";
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
      "d.id",
      jsonArrayFrom(
        eb
          .selectFrom("DatasetEval as de")
          .where("de.datasetId", "=", datasetId)
          .where("de.type", "=", "HEAD_TO_HEAD")
          .select(["de.id"]),
      ).as("evaluations"),
      jsonArrayFrom(
        eb.selectFrom("FineTune as ft").where("ft.datasetId", "=", datasetId).select(["ft.id"]),
      ).as("fineTunes"),
      sql<ComparisonModel[]>`d."enabledComparisonModels"::text[]`.as("enabledComparisonModels"),
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
      datasetId: dataset.id,
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
          .select([
            "ne.id as nodeEntryId",
            "ne.inputHash as nodeEntryInputHash",
            "ne.outputHash as nodeEntryOutputHash",
            "dene.id",
            "dene.datasetEvalId",
          ])
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
  const datasetEvalResultsToCreate: Prisma.DatasetEvalResultCreateManyInput[] = [];

  for (const datasetEvalNodeEntry of datasetEval.datasetEvalDatasetEntries) {
    for (let i = 0; i < datasetEval.outputSources.length; i++) {
      for (let j = i + 1; j < datasetEval.outputSources.length; j++) {
        const firstOutputSourceId = datasetEval.outputSources[i]?.id as string;
        const secondOutputSourceId = datasetEval.outputSources[j]?.id as string;
        evalsToRun.push({
          nodeEntryId: datasetEvalNodeEntry.nodeEntryId,
          firstOutputSourceId,
          secondOutputSourceId,
        });
        const firstResultId = uuidv4();
        const secondResultId = uuidv4();
        datasetEvalResultsToCreate.push({
          id: firstResultId,
          nodeEntryInputHash: datasetEvalNodeEntry.nodeEntryInputHash,
          nodeEntryOutputHash: datasetEvalNodeEntry.nodeEntryOutputHash,
          datasetEvalNodeEntryId: datasetEvalNodeEntry.id,
          datasetEvalOutputSourceId: firstOutputSourceId,
          comparisonResultId: secondResultId,
          comparisonOutputSourceId: secondOutputSourceId,
        });
        datasetEvalResultsToCreate.push({
          id: secondResultId,
          nodeEntryInputHash: datasetEvalNodeEntry.nodeEntryInputHash,
          nodeEntryOutputHash: datasetEvalNodeEntry.nodeEntryOutputHash,
          datasetEvalNodeEntryId: datasetEvalNodeEntry.id,
          datasetEvalOutputSourceId: secondOutputSourceId,
          comparisonResultId: firstResultId,
          comparisonOutputSourceId: firstOutputSourceId,
        });
      }
    }
  }

  // Shuffle so all models get results run at roughly the same rate
  const shuffledEvalsToRun = shuffle(evalsToRun);

  await prisma.datasetEvalResult.createMany({
    data: datasetEvalResultsToCreate,
    skipDuplicates: true,
  });

  for (const evalKey of shuffledEvalsToRun) {
    await evaluateTestSetEntries.enqueue(evalKey);
  }
};

// Used for both fine-tuned and comparison models
export const startTestJobsForModel = async ({
  modelId,
  datasetId,
}: {
  modelId: string;
  datasetId: string;
}) => {
  const dataset = await prisma.dataset.findUniqueOrThrow({
    where: {
      id: datasetId,
    },
  });

  const nodeEntriesToRun = await kysely
    .selectFrom("NodeEntry as ne")
    .innerJoin("DataChannel as dc", (join) =>
      join.onRef("dc.id", "=", "ne.dataChannelId").on("dc.destinationId", "=", dataset.nodeId),
    )
    .where("ne.status", "=", "PROCESSED")
    .where("ne.split", "=", "TEST")
    .leftJoin("FineTuneTestingEntry as ftte", (join) =>
      join.onRef("ftte.inputHash", "=", "ne.inputHash").on("ftte.modelId", "=", modelId),
    )
    .where("ftte.id", "is", null)
    .select(["ne.id as nodeEntryId"])
    .execute();

  await Promise.all(
    nodeEntriesToRun.map((nodeEntry) =>
      generateTestSetEntry.enqueue({
        modelId,
        nodeEntryId: nodeEntry.nodeEntryId,
        numPreviousTries: 0,
      }),
    ),
  );
};
