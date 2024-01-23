/*
  Warnings:

  - You are about to drop the column `datasetEntryId` on the `NodeData` table. All the data in the column will be lost.
  - You are about to drop the column `nodeDataId` on the `NodeData` table. All the data in the column will be lost.
  - You are about to drop the column `newDatasetEntryId` on the `PruningRuleMatch` table. All the data in the column will be lost.
  - You are about to drop the `NewDatasetEntry` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `inputHash` to the `NodeData` table without a default value. This is not possible if the table is not empty.
  - Added the required column `outputHash` to the `NodeData` table without a default value. This is not possible if the table is not empty.
  - Added the required column `split` to the `NodeData` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "NodeData" DROP CONSTRAINT "NodeData_datasetEntryId_fkey";

-- DropForeignKey
ALTER TABLE "PruningRuleMatch" DROP CONSTRAINT "PruningRuleMatch_newDatasetEntryId_fkey";

-- AlterTable
ALTER TABLE "Dataset" ADD COLUMN     "nodeId" UUID;

-- AlterTable
ALTER TABLE "DatasetFileUpload" ADD COLUMN     "nodeId" UUID,
ALTER COLUMN "datasetId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "NodeData" DROP COLUMN "datasetEntryId",
DROP COLUMN "nodeDataId",
ADD COLUMN     "inputHash" TEXT NOT NULL,
ADD COLUMN     "loggedCallId" UUID,
ADD COLUMN     "outputHash" TEXT NOT NULL,
ADD COLUMN     "rejectedOutputHash" TEXT,
ADD COLUMN     "split" "DatasetEntrySplit" NOT NULL;

-- AlterTable
ALTER TABLE "PruningRuleMatch" DROP COLUMN "newDatasetEntryId",
ADD COLUMN     "datasetEntryInputId" UUID;

-- DropTable
DROP TABLE "NewDatasetEntry";

-- CreateTable
CREATE TABLE "DatasetEntryInput" (
    "id" UUID NOT NULL,
    "function_call" JSONB,
    "functions" JSONB,
    "tool_choice" JSONB,
    "tools" JSONB,
    "messages" JSONB NOT NULL DEFAULT '[]',
    "response_format" JSONB,
    "inputTokens" INTEGER,
    "hash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DatasetEntryInput_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DatasetEntryOutput" (
    "output" JSONB,
    "hash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "CachedProcessedNodeData" (
    "id" UUID NOT NULL,
    "nodeHash" TEXT NOT NULL,
    "incomingDEIHash" TEXT NOT NULL,
    "incomingDEOHash" TEXT,
    "outgoingDEIHash" TEXT,
    "outgoingDEOHash" TEXT,
    "filterOutcome" TEXT,
    "explanation" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CachedProcessedNodeData_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DatasetEntryInput_hash_key" ON "DatasetEntryInput"("hash");

-- CreateIndex
CREATE UNIQUE INDEX "DatasetEntryOutput_hash_key" ON "DatasetEntryOutput"("hash");

-- CreateIndex
CREATE UNIQUE INDEX "CachedProcessedNodeData_nodeHash_incomingDEIHash_incomingDE_key" ON "CachedProcessedNodeData"("nodeHash", "incomingDEIHash", "incomingDEOHash");

-- AddForeignKey
ALTER TABLE "DatasetFileUpload" ADD CONSTRAINT "DatasetFileUpload_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "Node"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dataset" ADD CONSTRAINT "Dataset_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "Node"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PruningRuleMatch" ADD CONSTRAINT "PruningRuleMatch_datasetEntryInputId_fkey" FOREIGN KEY ("datasetEntryInputId") REFERENCES "DatasetEntryInput"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NodeData" ADD CONSTRAINT "NodeData_loggedCallId_fkey" FOREIGN KEY ("loggedCallId") REFERENCES "LoggedCall"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NodeData" ADD CONSTRAINT "NodeData_inputHash_fkey" FOREIGN KEY ("inputHash") REFERENCES "DatasetEntryInput"("hash") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NodeData" ADD CONSTRAINT "NodeData_outputHash_fkey" FOREIGN KEY ("outputHash") REFERENCES "DatasetEntryOutput"("hash") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NodeData" ADD CONSTRAINT "NodeData_rejectedOutputHash_fkey" FOREIGN KEY ("rejectedOutputHash") REFERENCES "DatasetEntryOutput"("hash") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CachedProcessedNodeData" ADD CONSTRAINT "CachedProcessedNodeData_incomingDEIHash_fkey" FOREIGN KEY ("incomingDEIHash") REFERENCES "DatasetEntryInput"("hash") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CachedProcessedNodeData" ADD CONSTRAINT "CachedProcessedNodeData_incomingDEOHash_fkey" FOREIGN KEY ("incomingDEOHash") REFERENCES "DatasetEntryOutput"("hash") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CachedProcessedNodeData" ADD CONSTRAINT "CachedProcessedNodeData_outgoingDEIHash_fkey" FOREIGN KEY ("outgoingDEIHash") REFERENCES "DatasetEntryInput"("hash") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CachedProcessedNodeData" ADD CONSTRAINT "CachedProcessedNodeData_outgoingDEOHash_fkey" FOREIGN KEY ("outgoingDEOHash") REFERENCES "DatasetEntryOutput"("hash") ON DELETE CASCADE ON UPDATE CASCADE;
