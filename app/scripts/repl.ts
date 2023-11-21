// disable eslint for this entire file
/* eslint-disable unused-imports/no-unused-imports */

import "dotenv/config";
import { prisma } from "../src/server/db";
import { startTestJobs } from "~/server/utils/startTestJobs";
import { Prisma } from "@prisma/client";
import { ChatCompletionCreateParams, ChatCompletionMessage } from "openai/resources/chat";
import { getCompletion2 } from "~/modelProviders/fine-tuned/getCompletion-2";
import { pick } from "lodash-es";

const setGlobal = (key: string, value: any) => {
  (global as any)[key] = value;
};

setGlobal("prisma", prisma);

setGlobal("startTestJobs", startTestJobs);

const fineTune = await prisma.fineTune.findUniqueOrThrow({
  where: { id: "7546b2e5-88f4-4c13-9780-187ecbc1913c" },
});

await prisma.fineTuneTestingEntry.deleteMany({
  where: { fineTuneId: fineTune.id },
});

await startTestJobs(fineTune.datasetId, "7546b2e5-88f4-4c13-9780-187ecbc1913c");

console.log("done");
