import { sql } from "kysely";

import { kysely, prisma } from "../db";

console.log("copying fields from LoggedCallModelResponse to LoggedCall");

const numLoggedCalls = await kysely
  .selectFrom("LoggedCall")
  .where("migrated", "=", false)
  .innerJoin(
    "LoggedCallModelResponse",
    "LoggedCallModelResponse.originalLoggedCallId",
    "LoggedCall.id",
  )
  .select(sql<number>`COUNT(*)`.as("loggedCallCount"))
  .executeTakeFirst()
  .then((result) => result?.loggedCallCount);

if (!numLoggedCalls) throw new Error("Unable to count logged calls");

console.log(`Found ${numLoggedCalls} logged calls to migrate`);

const BATCH_SIZE = 1000; // Adjust based on system capacity
let prevCreatedAt = new Date();
let totalProcessed = 0;

while (totalProcessed < numLoggedCalls) {
  const batch = await kysely
    .selectFrom("LoggedCall as lc")
    .innerJoin("LoggedCallModelResponse as lcmr", "lcmr.originalLoggedCallId", "lc.id")
    .select([
      "lc.id",
      "lc.createdAt",
      "lcmr.errorMessage",
      "lcmr.receivedAt",
      "lcmr.reqPayload",
      "lcmr.respPayload",
      "lcmr.statusCode",
      "lcmr.durationMs",
      "lcmr.inputTokens",
      "lcmr.outputTokens",
      "lcmr.finishReason",
      "lcmr.completionId",
      "lcmr.cost",
    ])
    .where(sql`lc."createdAt" <= ${prevCreatedAt}`)
    .where("lc.migrated", "=", false)
    .orderBy("createdAt", "desc")
    .limit(BATCH_SIZE)
    .execute();

  console.log("length", batch.length);

  const earliestCreatedAt = batch[batch.length - 1]?.createdAt;

  if (!earliestCreatedAt) break; // Exit loop if no more records to process

  console.log(`processing queries up until ${earliestCreatedAt.toLocaleString()}`);

  const promises = [];

  for (const loggedCall of batch) {
    promises.push(
      (async () => {
        try {
          await prisma.loggedCall.update({
            where: { id: loggedCall.id },
            data: {
              errorMessage: loggedCall.errorMessage,
              receivedAt: loggedCall.receivedAt,
              reqPayload: loggedCall.reqPayload as string,
              respPayload: loggedCall.respPayload as string,
              statusCode: loggedCall.statusCode,
              durationMs: loggedCall.durationMs,
              inputTokens: loggedCall.inputTokens,
              outputTokens: loggedCall.outputTokens,
              finishReason: loggedCall.finishReason,
              completionId: loggedCall.completionId,
              cost: loggedCall.cost,
              migrated: true,
            },
          });
        } catch (e) {
          console.error("error updating logged call", e);
        }
      })(),
    );
  }

  await Promise.all(promises);

  totalProcessed += batch.length;

  console.log(
    `Processed ${batch.length} in last batch. Total processed: ${totalProcessed}/${numLoggedCalls}`,
  );

  prevCreatedAt = earliestCreatedAt;
}

console.log("Update process completed. Total records updated:", totalProcessed);
