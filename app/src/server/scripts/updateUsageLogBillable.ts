import { kysely } from "~/server/db";

//Set usage log billable to false for openai fine tunes TESTING logs
const usageLogIds = await kysely
  .selectFrom("UsageLog")
  .where("UsageLog.type", "=", "TESTING")
  .innerJoin("FineTune", "FineTune.id", "UsageLog.fineTuneId")
  .where("FineTune.provider", "=", "openai")
  .select(["UsageLog.id"])
  .execute();

const idsToUpdate = usageLogIds.map((row: { id: string }) => row.id);

if (idsToUpdate.length > 0) {
  console.log(`updating ${idsToUpdate.length} usage logs`);
  await kysely
    .updateTable("UsageLog")
    .set({ billable: false })
    .where("id", "in", idsToUpdate)
    .execute();
} else {
  console.log(`no usage logs to update`);
}
