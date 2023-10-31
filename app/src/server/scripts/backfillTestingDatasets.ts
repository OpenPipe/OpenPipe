import { prisma } from "~/server/db";
import { evaluateTestSetEntry } from "../tasks/evaluateTestSetEntry.task";

if (!process.argv[2]) {
  console.error("please provide a fineTuneId");
  process.exit(1);
}

const fineTuneId = process.argv[2];

console.log("backfilling testing datasets for id", fineTuneId);

const fineTune = await prisma.fineTune.findUnique({
  where: {
    id: fineTuneId,
  },
  include: {
    dataset: {
      include: {
        datasetEntries: {
          select: {
            id: true,
          },
          where: {
            outdated: false,
            split: "TEST",
          },
          orderBy: {
            sortKey: "desc",
          },
        },
      },
    },
  },
});

if (!fineTune) {
  console.error("no fine tune found");
  process.exit(1);
}

console.log(`queueing ${fineTune.dataset.datasetEntries.length} fine tune testing entry jobs`);

for (const entry of fineTune.dataset.datasetEntries) {
  await evaluateTestSetEntry.enqueue({
    modelId: fineTune.id,
    datasetEntryId: entry.id,
    skipCache: true,
  });
}

console.log("done");
