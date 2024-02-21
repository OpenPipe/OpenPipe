import { prisma } from "../db";

// delete all Nodes
await prisma.node.deleteMany();

// delete all DatasetEntryInputs
await prisma.datasetEntryInput.deleteMany();

// delete all DatasetEntryOutputs
await prisma.datasetEntryOutput.deleteMany();

// delete all CachedProcessedNodeEntries
await prisma.cachedProcessedEntry.deleteMany();

// // delete previously invalid uploads
// await prisma.datasetFileUpload.deleteMany({
//     where: {
//         datasetId: null
//     }
// })
