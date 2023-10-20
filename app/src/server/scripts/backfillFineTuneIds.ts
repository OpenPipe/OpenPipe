import { ComparisonModel } from "@prisma/client";

import { prisma } from "~/server/db";

const testingEntries = await prisma.fineTuneTestingEntry.findMany({
  where: {
    fineTuneId: null,
    modelId: { not: ComparisonModel.GPT_3_5_TURBO },
  },
});

const entriesToBackfill = testingEntries.filter(
  (entry) => entry.modelId !== ComparisonModel.GPT_3_5_TURBO,
);

console.log(`backfilling ${entriesToBackfill.length} entries`);

const updateArgs = entriesToBackfill.map((entry) =>
  prisma.fineTuneTestingEntry.update({
    where: { id: entry.id },
    data: { fineTuneId: entry.modelId },
  }),
);

await prisma.$transaction(updateArgs);

console.log("done");
