import { prisma } from "../db";

// delete all PruningRulesChecked
await prisma.pruningRulesChecked.deleteMany();

console.log("Deleted all PruningRulesChecked");

// delete all NodeEntries
await prisma.nodeEntry.deleteMany();

console.log("Deleted all NodeEntries");

// delete all Nodes
await prisma.node.deleteMany();

console.log("Deleted all Nodes");

// delete previously invalid uploads
await prisma.datasetFileUpload.deleteMany({
  where: {
    datasetId: null,
  },
});

console.log("Deleted previously invalid uploads");

// Slower commands

// // delete all DatasetEntryInputs
// await prisma.datasetEntryInput.deleteMany();

// console.log("Deleted all DatasetEntryInputs");

// // delete all DatasetEntryOutputs
// await prisma.datasetEntryOutput.deleteMany();

// console.log("Deleted all DatasetEntryOutputs");

// // delete all CachedProcessedNodeEntries
// await prisma.cachedProcessedEntry.deleteMany();

// console.log("Deleted all CachedProcessedNodeEntries");
