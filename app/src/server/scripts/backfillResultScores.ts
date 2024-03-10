import { kysely } from "../db";
import { startTestJobsForEval } from "../utils/nodes/startTestJobs";

const datasetEvals = await kysely
  .selectFrom("DatasetEval as de")
  .innerJoin("Dataset as d", "d.id", "de.datasetId")
  .innerJoin("DatasetEvalOutputSource as deos", "deos.datasetEvalId", "de.id")
  .innerJoin("DatasetEvalResult as der", (join) =>
    join
      .onRef("der.datasetEvalOutputSourceId", "=", "deos.id")
      .on("der.status", "=", "COMPLETE")
      .on("der.score", "is", null),
  )
  .selectAll("de")
  .select(["d.nodeId"])
  .execute();

console.log(`Found evals to backfill: ${datasetEvals.length}.`);

for (const datasetEval of datasetEvals) {
  await startTestJobsForEval({
    datasetEvalId: datasetEval.id,
    nodeEntryBaseQuery: kysely
      .selectFrom("NodeEntry as ne")
      .innerJoin("DataChannel as dc", (join) =>
        join
          .onRef("dc.id", "=", "ne.dataChannelId")
          .on("dc.destinationId", "=", datasetEval.nodeId),
      )
      .where("ne.split", "=", "TEST")
      .where("ne.status", "=", "PROCESSED"),
  });
}

console.log("All jobs started.");
