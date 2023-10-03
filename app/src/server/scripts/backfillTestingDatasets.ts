import { prisma } from "~/server/db";
import { queueGetTestResult } from "../tasks/getTestResult.task";

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
            type: "TEST",
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
let numEntries = 0;

for (const entry of fineTune.dataset.datasetEntries) {
  await queueGetTestResult(fineTune.id, entry.id);
  numEntries++;
}

console.log(`queueing ${numEntries} fine tune testing entry jobs`);

console.log("done");
