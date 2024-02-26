// disable eslint for this entire file
/* eslint-disable unused-imports/no-unused-imports */

import "dotenv/config";
import { prisma } from "../src/server/db";
import { generateBlobDownloadUrl } from "~/utils/azure/server";
import { trainFineTune } from "~/server/tasks/fineTuning/trainFineTune.task";

import crypto from "crypto";
import { startTestJobs } from "~/server/utils/startTestJobs";
import { fireworksTestSetLimit } from "~/utils/rateLimit/rateLimits";

const model = await prisma.fineTune.findUniqueOrThrow({
  where: {
    id: "b501e7c7-b4d6-49a8-9c93-f4d57e607345",
  },
});

await prisma.fineTuneTestingEntry.deleteMany({
  where: {
    modelId: model.id,
  },
});

await startTestJobs(model.datasetId, model.id);
