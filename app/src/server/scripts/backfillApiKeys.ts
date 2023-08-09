import { type Prisma } from "@prisma/client";
import { prisma } from "~/server/db";
import { generateApiKey } from "~/server/utils/generateApiKey";

console.log("backfilling api keys");

const projects = await prisma.project.findMany({
  include: {
    apiKeys: true,
  },
});

console.log(`found ${projects.length} projects`);

const apiKeysToCreate: Prisma.ApiKeyCreateManyInput[] = [];

for (const proj of projects) {
  if (!proj.apiKeys.length) {
    apiKeysToCreate.push({
      name: "Default API Key",
      projectId: proj.id,
      apiKey: generateApiKey(),
    });
  }
}

console.log(`creating ${apiKeysToCreate.length} api keys`);

await prisma.apiKey.createMany({
  data: apiKeysToCreate,
});

console.log("done");
