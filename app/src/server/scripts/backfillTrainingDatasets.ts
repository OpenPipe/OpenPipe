import { type Prisma } from "@prisma/client";
import { prisma } from "~/server/db";

console.log("backfilling trainig datasets keys");

const fineTunes = await prisma.fineTune.findMany({
  include: {
    dataset: {
      include: {
        datasetEntries: {
          select: {
            id: true,
          },
          where: {
            outdated: false,
            type: "TRAIN",
          },
        },
      },
    },
    _count: {
      select: {
        trainingEntries: true,
      },
    },
  },
});

console.log(`found ${fineTunes.length} fineTunes`);

const trainingEntriesToCreate: Prisma.FineTuneTrainingEntryCreateManyInput[] = [];

for (const fineTune of fineTunes) {
  if (!fineTune._count.trainingEntries) {
    trainingEntriesToCreate.push(
      ...fineTune.dataset.datasetEntries.map((datasetEntry) => ({
        fineTuneId: fineTune.id,
        datasetEntryId: datasetEntry.id,
      })),
    );
  }
}

console.log(`creating ${trainingEntriesToCreate.length} fine tune training entries`);

await prisma.fineTuneTrainingEntry.createMany({
  data: trainingEntriesToCreate,
});

console.log("done");
