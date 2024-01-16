import { sql } from "kysely";

import { kysely } from "../db";

console.log("Backfilling usage log project ids");

const numUsageLogsToBackfill = await kysely
  .selectFrom("UsageLog as ul")
  .where("ul.projectId", "is", null)
  .select(sql<number>`count(*)::int`.as("numLogs"))
  .executeTakeFirst();

console.log(`Found usage logs to backfill: ${numUsageLogsToBackfill?.numLogs ?? 0}`);

// process one batch of 10000 usage logs at a time
let total = 0;
while (true) {
  const ids = await kysely
    .selectFrom("UsageLog as ul")
    .where("ul.projectId", "is", null)
    .select("ul.id")
    .limit(1000)
    .execute()
    .then((rows) => rows.map((row) => row.id));

  if (!ids.length) break;

  await kysely
    .updateTable("UsageLog as ul")
    .set((eb) => ({
      projectId: eb
        .selectFrom("FineTune as ft")
        .whereRef("ft.id", "=", "ul.fineTuneId")
        .select("ft.projectId")
        .limit(1),
    }))
    .where("ul.id", "in", ids)
    .execute();

  total += ids.length;
  console.log(`Processed ${total}/${numUsageLogsToBackfill?.numLogs ?? 0}`);
}

console.log("Done!");
