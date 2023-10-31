import { prisma } from "../db";
import { evaluateTestSetEntry } from "../tasks/evaluateTestSetEntry.task";

export const startDatasetEntryTestJobs = async (datasetEntryId: string) => {
  const datasetEntry = await prisma.datasetEntry.findFirst({
    where: { id: datasetEntryId, type: "TEST" },
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
    await evaluateTestSetEntry.enqueue({ modelId: fineTune.id, datasetEntryId });
  }
  for (const comparisonModel of datasetEntry.dataset.enabledComparisonModels) {
    await evaluateTestSetEntry.enqueue({ modelId: comparisonModel, datasetEntryId });
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
      type: "TEST",
      fineTuneTestDatasetEntries: { none: { modelId } },
    },
    select: { id: true, messages: true },
    orderBy: { sortKey: "desc" },
  });

  for (const entry of datasetEntries) {
    await evaluateTestSetEntry.enqueue({ modelId, datasetEntryId: entry.id });
  }
};
