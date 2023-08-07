import { type Prisma } from "@prisma/client";
import { prisma } from "~/server/db";
import { generateApiKey } from "~/server/utils/generateApiKey";

console.log("backfilling api keys");

const organizations = await prisma.organization.findMany({
  include: {
    apiKeys: true,
  },
});

console.log(`found ${organizations.length} organizations`);

const apiKeysToCreate: Prisma.ApiKeyCreateManyInput[] = [];

for (const org of organizations) {
  if (!org.apiKeys.length) {
    apiKeysToCreate.push({
      name: "Default API Key",
      organizationId: org.id,
      apiKey: generateApiKey(),
    });
  }
}

console.log(`creating ${apiKeysToCreate.length} api keys`);

await prisma.apiKey.createMany({
  data: apiKeysToCreate,
});

console.log("done");