import { prisma } from "../../db";

export const copyDatasetEvalDatasetEntries = async (
  prevDatasetEntryId: string,
  newDatasetEntryId: string,
) => {
  const datasetEvalDatasetEntries = await prisma.datasetEvalDatasetEntry.findMany({
    where: { datasetEntryId: prevDatasetEntryId },
  });

  for (const datasetEvalDatasetEntry of datasetEvalDatasetEntries) {
    await prisma.datasetEvalDatasetEntry.create({
      data: {
        datasetEvalId: datasetEvalDatasetEntry.datasetEvalId,
        datasetEntryId: newDatasetEntryId,
      },
    });
  }
};
