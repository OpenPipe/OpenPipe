import { kysely, prisma } from "~/server/db";
import {
  FIELD_COMPARISON_EVAL_NAME,
  saveFieldComparisonScore,
} from "~/server/utils/calculateFieldComparisonScore";

console.log("Migrating field scores");

const datasets = await prisma.dataset.findMany();

console.log(`Found ${datasets.length} datasets`);

for (const dataset of datasets) {
  const jsonEntries = await kysely
    .selectFrom("DatasetEntry as de")
    .where("de.datasetId", "=", dataset.id)
    .innerJoin("FineTuneTestingEntry as ftte", "ftte.datasetEntryId", "de.id")
    .where("ftte.score", "is not", null)
    .select(["ftte.score", "ftte.modelId", "ftte.datasetEntryId", "de.datasetId"])
    .execute();

  if (!jsonEntries.length) continue;

  let datasetEval = await prisma.datasetEval.findUnique({
    where: {
      datasetId_name: { datasetId: dataset.id, name: FIELD_COMPARISON_EVAL_NAME },
    },
  });

  if (!datasetEval) {
    datasetEval = await prisma.datasetEval.create({
      data: {
        datasetId: dataset.id,
        name: FIELD_COMPARISON_EVAL_NAME,
        type: "FIELD_COMPARISON",
      },
    });
  }

  console.log(`Found ${jsonEntries.length} dataset entries for dataset ${dataset.name}`);

  for (const fineTuneTestingEntry of jsonEntries) {
    await saveFieldComparisonScore(
      fineTuneTestingEntry.datasetId,
      fineTuneTestingEntry.datasetEntryId,
      fineTuneTestingEntry.score as number,
      fineTuneTestingEntry.modelId,
    );
  }
}

console.log("Done");
