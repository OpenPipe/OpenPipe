// disable eslint for this entire file
/* eslint-disable unused-imports/no-unused-imports */

import "dotenv/config";
import { kysely, prisma } from "../src/server/db";
import { generateBlobDownloadUrl } from "~/utils/azure/server";
import { trainFineTune } from "~/server/tasks/fineTuning/trainFineTune.task";

import crypto from "crypto";
import { startTestJobsForModel } from "~/server/utils/nodes/startTestJobs";
import { fireworksTestSetLimit } from "~/utils/rateLimits";

const model = await prisma.fineTune.findUniqueOrThrow({
  where: {
    id: "b501e7c7-b4d6-49a8-9c93-f4d57e607345",
  },
  include: {
    dataset: true,
  },
});

await prisma.fineTuneTestingEntry.deleteMany({
  where: {
    modelId: model.id,
  },
});

await startTestJobsForModel({
  modelId: model.id,
  nodeEntryBaseQuery: kysely
    .selectFrom("NodeEntry as ne")
    .where("ne.nodeId", "=", model.dataset.nodeId),
});
