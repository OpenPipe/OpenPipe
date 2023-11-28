import { prisma } from "../db";
import { generateTestSetEntry } from "../tasks/generateTestSetEntry.task";

export const startDatasetEntryTestJobs = async (datasetEntryId: string) => {
  const datasetEntry = await prisma.datasetEntry.findFirst({
    where: { id: datasetEntryId, split: "TEST" },
    include: {
      dataset: {
        include: {
          fineTunes: {
            where: { status: "DEPLOYED" },
          },
        },
      },
    },
  });

  if (!datasetEntry?.dataset) return;

  for (const fineTune of datasetEntry.dataset.fineTunes) {
    await generateTestSetEntry.enqueue({
      modelId: fineTune.id,
      datasetEntryId,
      numPreviousTries: 0,
    });
  }
  for (const comparisonModel of datasetEntry.dataset.enabledComparisonModels) {
    await generateTestSetEntry.enqueue({
      modelId: comparisonModel,
      datasetEntryId,
      numPreviousTries: 0,
    });
  }
};

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
