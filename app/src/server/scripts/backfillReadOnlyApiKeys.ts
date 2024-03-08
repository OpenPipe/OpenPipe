import { v4 as uuidv4 } from "uuid";

import { generateApiKey } from "~/server/utils/generateApiKey";

import { kysely } from "../db";

console.log("Backfilling read-only API keys");

const projectsToBackfill = await kysely
  .selectFrom("Project as p")
  // only backfill projects that don't have a read-only API key
  .where((eb) =>
    eb.not(
      eb.exists(
        eb.selectFrom("ApiKey").whereRef("projectId", "=", "p.id").where("readOnly", "=", true),
      ),
    ),
  )
  .select("p.id")
  .execute();

console.log("Found projects to backfill:", projectsToBackfill.length);

for (let i = 0; i < projectsToBackfill.length; i++) {
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const { id } = projectsToBackfill[i]!;
  console.log(`Backfilling project (${i + 1}/${projectsToBackfill.length}):${id}`);

  await kysely
    .insertInto("ApiKey")
    .values({
      id: uuidv4(),
      name: "Read-Only API Key",
      projectId: id,
      apiKey: generateApiKey(),
      readOnly: true,
      updatedAt: new Date(),
    })
    .execute();
}

console.log("Done!");
