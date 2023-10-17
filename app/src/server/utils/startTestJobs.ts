import { prisma } from "../db";
import { evaluateTestSetEntry } from "../tasks/evaluateTestSetEntry.task";

export const startDatasetTestJobs = async (datasetId: string) => {
  const dataset = await prisma.dataset.findUnique({
    where: { id: datasetId },
    include: {
      fineTunes: {
        where: { status: "DEPLOYED" },
      },
    },
  });
  if (!dataset) return;
  for (const fineTune of dataset.fineTunes) {
    await startTestJobs(datasetId, fineTune.id);
  }
  for (const comparisonModel of dataset.enabledComparisonModels) {
    await startTestJobs(datasetId, comparisonModel);
  }
};

export const startTestJobs = async (datasetId: string, modelId: string) => {
  const datasetEntries = await prisma.datasetEntry.findMany({
    where: {
      datasetId,
      outdated: false,
      type: "TEST",
      fineTuneTestDatasetEntries: { none: { modelId } },
    },
    select: { id: true, messages: true },
    orderBy: { sortKey: "desc" },
  });

  // create fineTuneTestEntry for each dataset entry
  await prisma.fineTuneTestingEntry.createMany({
    data: datasetEntries.map((entry) => ({
      modelId,
      datasetEntryId: entry.id,
    })),
    skipDuplicates: true,
  });
  for (const entry of datasetEntries) {
    await evaluateTestSetEntry.enqueue({ modelId, datasetEntryId: entry.id });
  }
};
