// disable eslint for this entire file
/* eslint-disable unused-imports/no-unused-imports */

import "dotenv/config";
import { sql } from "kysely";
import { kysely } from "~/server/db";
import { rating, rate, ordinal } from "openskill";
import { bradleyTerryFull } from "openskill/dist/models";
import { table } from "table";
import { clone, max, mean, shuffle } from "lodash-es";

let matchesQuery = kysely
  .selectFrom((eb) =>
    eb
      .selectFrom("DatasetEvalResult as r1")
      .select(() => [
        sql<string>`coalesce(ft1."baseModel", os1."modelId")`.as("model1"),
        sql<string>`coalesce(ft2."baseModel", os2."modelId")`.as("model2"),
        sql<string>`d.name`.as("dataset"),
      ])
      .select(["r1.score", "r1.createdAt"])
      .innerJoin("DatasetEvalResult as r2", "r1.comparisonResultId", "r2.id")
      .innerJoin("DatasetEvalOutputSource as os1", "r1.datasetEvalOutputSourceId", "os1.id")
      .innerJoin("DatasetEval", "os1.datasetEvalId", "DatasetEval.id")
      .innerJoin("Dataset as d", "DatasetEval.datasetId", "d.id")
      .leftJoin("FineTune as ft1", (join) => join.onRef(sql`ft1.id::text`, "=", "os1.modelId"))
      .innerJoin("DatasetEvalOutputSource as os2", "r2.datasetEvalOutputSourceId", "os2.id")
      .leftJoin("FineTune as ft2", (join) => join.onRef(sql`ft2.id::text`, "=", "os2.modelId"))
      .where("r1.status", "=", "COMPLETE")
      .where("r1.wasFirst", "=", true)
      .where("r1.score", "is not", null)
      .as("matches"),
  )
  .whereRef("model1", "!=", "model2");
const selectedModels = [
  // "mistralai/Mistral-7B-v0.1",
  // "meta-llama/Llama-2-7b-hf",
  // "meta-llama/Llama-2-13b-hf",
  "GPT_4_0613",
  // "GPT_4_1106_PREVIEW",
  // "GPT_3_5_TURBO",
  // "gpt-3.5-turbo-1106",
  // "OpenPipe/mistral-7b-1214-beta",
  "OpenPipe/mistral-ft-optimized-1214",
];
// matchesQuery = matchesQuery
// .where("model1", "in", selectedModels)
// .where("model2", "in", selectedModels);

const blacklistModels = [
  "original",
  "meta-llama/Llama-2-13b-hf",
  "OpenPipe/mistral-7b-1212",
  "OpenPipe/mistral-7b-1213",
];
matchesQuery = matchesQuery
  .where("model1", "not in", blacklistModels)
  .where("model2", "not in", blacklistModels);

const matches = await matchesQuery
  .orderBy(sql`random()`)
  // .orderBy("matches.createdAt")
  .selectAll("matches")
  .execute();

const datasetCounts = matches.reduce(
  (counts, match) => {
    counts[match.dataset] = (counts[match.dataset] ?? 0) + 1;
    return counts;
  },
  {} as Record<string, number>,
);

const largestDataset = max(Object.values(datasetCounts)) ?? 0;

// Augment the matches so that each dataset has equal representation
const augmentedMatches = matches.flatMap((match) => {
  const augmentCount = Math.round(largestDataset / (datasetCounts[match.dataset] ?? 1));
  return Array(augmentCount).fill(match) as typeof matches;
});

const runOneTournament = (name: string, matchesSlice: typeof matches, epochs: number) => {
  const ratingsCache: Record<string, { mu: number; sigma: number; matches: number }> = {};

  const getRating = (model: string) => ratingsCache[model] ?? { mu: 24, sigma: 1, matches: 0 };

  const updateRating = (model1: string, model2: string, score: number) => {
    const rating1 = getRating(model1);
    const rating2 = getRating(model2);

    const [team1, team2] = rate([[rating1], [rating2]], {
      score: [score, 1 - score],
      model: bradleyTerryFull,
    });

    const newRating1 = team1?.[0];
    const newRating2 = team2?.[0];

    if (!newRating1 || !newRating2) throw new Error("Expected new rating");

    ratingsCache[model1] = { ...newRating1, matches: rating1.matches + 1 };
    ratingsCache[model2] = { ...newRating2, matches: rating2.matches + 1 };
  };

  for (let i = 0; i < epochs; i++) {
    for (const match of shuffle(matchesSlice)) {
      if (match.score !== null) updateRating(match.model1, match.model2, match.score);
    }
  }
  const ratings = Object.entries(ratingsCache)
    .map(([model, r]) => ({ model, ...r, ordinal: ordinal(r) }))
    .sort((a, b) => b.mu - a.mu);

  const ratingScale = 1200 / rating().mu;

  console.log(`${name} (${matchesSlice.length} matches, ${epochs} epochs)`);
  console.log(
    table([
      ["Model", "Mean", "Std Dev", "Ordinal", "Matches"],
      ...ratings.map((r) => [
        r.model,
        (r.mu * ratingScale).toFixed(0),
        (r.sigma * ratingScale).toFixed(1),
        (ordinal(r) * ratingScale).toFixed(0),
        r.matches / epochs,
      ]),
    ]),
  );
};

runOneTournament("All", matches, 50);
runOneTournament("All (augmented)", augmentedMatches, 20);

const datasets = await matchesQuery.groupBy("dataset").select("dataset").execute();

for (const dataset of datasets) {
  const matchesSlice = matches.filter((m) => m.dataset === dataset.dataset);
  runOneTournament(dataset.dataset, matchesSlice, 30);
}

const hthResults = await matchesQuery
  .groupBy(["model1", "model2", "dataset"])
  .select(() => [
    "model1",
    "model2",
    "dataset",
    sql<number>`avg("score")`.as("winRate"),
    sql<number>`count(*)`.as("matches"),
  ])
  // .orderBy(sql`avg("score") desc`)
  .execute();

// console.log(
//   table([
//     ["model1", "model2", "dataset", "winRate", "matches"],
//     ...hthResults.map((r) => [r.model1, r.model2, r.dataset, r.winRate.toFixed(2), r.matches]),
//   ]),
// );
