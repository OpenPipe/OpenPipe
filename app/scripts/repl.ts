// disable eslint for this entire file
/* eslint-disable unused-imports/no-unused-imports */

import "dotenv/config";
import { prisma } from "../src/server/db";
import { generateBlobDownloadUrl } from "~/utils/azure/server";
import { trainFineTune } from "~/server/tasks/fineTuning/trainFineTune.task";

const setGlobal = (key: string, value: any) => {
  (global as any)[key] = value;
};

setGlobal("prisma", prisma);

// const fineTune = await prisma.fineTune.findUniqueOrThrow({
//   where: { id: "7546b2e5-88f4-4c13-9780-187ecbc1913c" },
// });

// await prisma.fineTuneTestingEntry.deleteMany({
//   where: { fineTuneId: fineTune.id },
// });

// await startTestJobs(fineTune.datasetId, "7546b2e5-88f4-4c13-9780-187ecbc1913c");

// console.log("done");
// console.log(
//   await generateBlobDownloadUrl(
//     "1453795139259-04708bc4-4f35-4b89-beb1-7ee25efc29e2-training.jsonl",
//   ),
// );

// large
// await trainFineTune.runNow({ fineTuneId: "a72645ec-377c-4179-8bb5-772812c0bfde" });

// test
await trainFineTune.runNow({ fineTuneId: "c5364071-73f0-40ff-910b-bd580b319bb0" });
