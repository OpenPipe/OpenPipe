import yargs from "yargs";
import { hideBin } from "yargs/helpers";

import { kysely } from "../db";

const argv = await yargs(hideBin(process.argv)).option("slug", {
  type: "string",
  description: "The slug of a specific project to clean",
  demandOption: false,
}).argv;

let projectId;

if (argv.slug) {
  const project = await kysely
    .selectFrom("Project")
    .where("slug", "=", argv.slug)
    .select("id")
    .executeTakeFirst();

  if (!project) {
    console.error(`Project with slug ${argv.slug} not found`);
    process.exit(1);
  }

  console.log(`Found project with slug ${argv.slug} ID = ${project.id}`);

  projectId = project.id;
}

if (!projectId) {
  // delete all PruningRulesChecked
  await kysely.deleteFrom("PruningRulesChecked").execute();
  console.log("Deleted all PruningRulesChecked");
}

if (!projectId) {
  // delete previously invalid uploads
  await kysely.deleteFrom("DatasetFileUpload").where("datasetId", "is", null).execute();
  console.log("Deleted previously invalid uploads");
}

// delete all Nodes
let nodeDeletionQuery = kysely.deleteFrom("Node");
if (projectId) {
  nodeDeletionQuery = nodeDeletionQuery.where("projectId", "=", projectId);
}
await nodeDeletionQuery.execute();
console.log("Deleted all Nodes");

// delete all CachedProcessedNodeEntries
await kysely.deleteFrom("CachedProcessedEntry").execute();
console.log("Deleted all CachedProcessedNodeEntries");

let testingEntryDeletionQuery = kysely.deleteFrom("FineTuneTestingEntry");
if (projectId) {
  testingEntryDeletionQuery = testingEntryDeletionQuery.where("projectId", "=", projectId);
}
await testingEntryDeletionQuery.execute();
console.log("Deleted all NewFineTuneTestingEntries");

// Slower commands

// delete all DatasetEntryInputs
let datasetEntryInputDeletionQuery = kysely.deleteFrom("DatasetEntryInput");
if (projectId) {
  datasetEntryInputDeletionQuery = datasetEntryInputDeletionQuery.where(
    "projectId",
    "=",
    projectId,
  );
}
await datasetEntryInputDeletionQuery.execute();
console.log("Deleted all DatasetEntryInputs");

// delete all DatasetEntryOutputs
let datasetEntryOutputDeletionQuery = kysely.deleteFrom("DatasetEntryOutput");
if (projectId) {
  datasetEntryOutputDeletionQuery = datasetEntryOutputDeletionQuery.where(
    "projectId",
    "=",
    projectId,
  );
}
await datasetEntryOutputDeletionQuery.execute();
console.log("Deleted all DatasetEntryOutputs");

if (projectId) {
  await kysely
    .updateTable("Project")
    .set({ migrationKey: null })
    .where("id", "=", projectId)
    .execute();
}
