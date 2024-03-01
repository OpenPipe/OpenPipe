import { kysely } from "../db";

// delete all PruningRulesChecked
await kysely.deleteFrom("PruningRulesChecked").execute();
console.log("Deleted all PruningRulesChecked");

// delete all NodeEntries
await kysely.deleteFrom("NodeEntry").execute();
console.log("Deleted all NodeEntries");

// delete all Nodes
await kysely.deleteFrom("Node").execute();
console.log("Deleted all Nodes");

// delete previously invalid uploads
await kysely.deleteFrom("DatasetFileUpload").where("datasetId", "is", null).execute();
console.log("Deleted previously invalid uploads");

// delete all CachedProcessedNodeEntries
await kysely.deleteFrom("CachedProcessedEntry").execute();
console.log("Deleted all CachedProcessedNodeEntries");

await kysely.deleteFrom("NewFineTuneTestingEntry").execute();
console.log("Deleted all NewFineTuneTestingEntries");

await kysely.deleteFrom("NewFineTuneTrainingEntry").execute();
console.log("Deleted all NewFineTuneTrainingEntries");

// Slower commands

// delete all DatasetEntryInputs
await kysely.deleteFrom("DatasetEntryInput").execute();
console.log("Deleted all DatasetEntryInputs");

// delete all DatasetEntryOutputs
await kysely.deleteFrom("DatasetEntryOutput").execute();
console.log("Deleted all DatasetEntryOutputs");
