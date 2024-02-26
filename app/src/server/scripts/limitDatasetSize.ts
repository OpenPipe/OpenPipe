import yargs from "yargs";

import { hideBin } from "yargs/helpers";
import { kysely } from "../db";
import { sql } from "kysely";

const argv = await yargs(hideBin(process.argv)).option("projectId", {
  type: "string",
  description: "The id of the project to migrate",
  demandOption: true,
}).argv;

const projectId = argv.projectId;

const datasets = await kysely
  .selectFrom("Dataset as d")
  .where("d.projectId", "=", projectId)
  .selectAll("d")
  .execute();

console.log(`Found ${datasets.length} datasets`);

// limit the size of each dataset to 10,000 dataset entries
for (const dataset of datasets) {
  const totalEntries = await kysely
    .selectFrom("DatasetEntry")
    .where("datasetId", "=", dataset.id)
    .select(sql<number>`count(*)::int`.as("count"))
    .executeTakeFirst();

  if (!totalEntries) {
    console.log(`skipping dataset ${dataset.name}`);
    continue;
  }

  const total = totalEntries.count;
  if (total > 20000) {
    const entriesToDelete = total - 20000;

    const cutoffId = await kysely
      .selectFrom("DatasetEntry")
      .where("datasetId", "=", dataset.id)
      .select("id")
      .orderBy("id")
      .limit(1)
      .offset(20000)
      .executeTakeFirst();

    if (!cutoffId) {
      throw new Error("Could not find 10,000th entry");
    }

    await kysely.deleteFrom("DatasetEntry").where("id", ">", cutoffId.id).execute();

    console.log(
      `Reduced dataset ${dataset.id} to 10,000 entries by deleting ${entriesToDelete} entries.`,
    );
  } else {
    console.log(`Dataset ${dataset.id} has ${total} entries, no need to delete.`);
  }
}
