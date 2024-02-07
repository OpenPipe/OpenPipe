import { sql } from "kysely";

import { kysely } from "../db";

console.log("Backfilling numLoggedCalls and tagNames");

const projects = await kysely
  .selectFrom("Project as p")
  .selectAll("p")
  .orderBy("createdAt", "desc")
  .execute();

console.log("Found projects to backfill:", projects.length);

let i = 0;
for (const project of projects) {
  console.log(`Backfilling project ${i}/${projects.length}: ${project.id} - ${project.name}`);

  await kysely.transaction().execute(async (trx) => {
    const numLoggedCalls = await trx
      .selectFrom("LoggedCall as lc")
      .where("lc.projectId", "=", project.id)
      .select(sql<number>`count(*)::int`.as("numLoggedCalls"))
      .executeTakeFirst();

    console.log(`numLoggedCalls: ${numLoggedCalls?.numLoggedCalls ?? 0}`);

    await trx
      .updateTable("Project as p")
      .set({
        numLoggedCalls: numLoggedCalls?.numLoggedCalls ?? 0,
      })
      .where("p.id", "=", project.id)
      .execute();
  });

  await kysely.transaction().execute(async (trx) => {
    const tags = await trx
      .selectFrom("LoggedCallTag")
      .where("projectId", "=", project.id)
      .select(["name"])
      .distinct()
      .orderBy("name", "asc")
      .execute();

    console.log(`tags: ${tags.length}`);

    await trx
      .updateTable("Project as p")
      .set({
        tagNames: tags.map((tag) => tag.name),
      })
      .where("p.id", "=", project.id)
      .execute();
  });

  i++;
}

console.log("Done!");
