import { kysely, prisma } from "../db";
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
  const rows = await kysely
    .selectFrom("Dataset as d")
    .where("d.id", "=", datasetId)
    .innerJoin("Node as n", "n.id", "d.nodeId")
    .innerJoin("NodeData as nd", "nd.nodeId", "n.id")
    .where("split", "=", "TEST")
    .where("status", "=", "PROCESSED")
    .leftJoin("FineTuneTestingEntry as ftte", (join) =>
      join.onRef("ftte.inputHash", "=", "nd.inputHash").on("ftte.modelId", "=", modelId),
    )
    .where("ftte.id", "is", null)
    .select(["nd.id"])
    .orderBy("nd.importId", "desc")
    .execute();

  // TODO: Calculate and save field comparison scores separately?

  for (const row of rows) {
    await generateTestSetEntry.enqueue({ modelId, nodeDataId: row.id, numPreviousTries: 0 });
  }
};
