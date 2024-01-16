import { prisma } from "../db";
import { generateTestSetEntry } from "../tasks/generateTestSetEntry.task";

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
      split: "TEST",
      fineTuneTestDatasetEntries: { none: { modelId } },
    },
    select: { id: true },
    orderBy: { sortKey: "desc" },
  });

  for (const entry of datasetEntries) {
    await generateTestSetEntry.enqueue({ modelId, datasetEntryId: entry.id, numPreviousTries: 0 });
  }
};
