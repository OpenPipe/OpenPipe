/*
  Warnings:

  - You are about to drop the `DatasetEntry` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `DatasetEvalDatasetEntry` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `DatasetEvalResult` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `FineTuneTestingEntry` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `FineTuneTrainingEntry` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PruningRuleMatch` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `RelabelRequest` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "DatasetEntry" DROP CONSTRAINT "DatasetEntry_authoringUserId_fkey";

-- DropForeignKey
ALTER TABLE "DatasetEntry" DROP CONSTRAINT "DatasetEntry_datasetId_fkey";

-- DropForeignKey
ALTER TABLE "DatasetEntry" DROP CONSTRAINT "DatasetEntry_loggedCallId_fkey";

-- DropForeignKey
ALTER TABLE "DatasetEvalDatasetEntry" DROP CONSTRAINT "DatasetEvalDatasetEntry_datasetEntryId_fkey";

-- DropForeignKey
ALTER TABLE "DatasetEvalDatasetEntry" DROP CONSTRAINT "DatasetEvalDatasetEntry_datasetEvalId_fkey";

-- DropForeignKey
ALTER TABLE "DatasetEvalResult" DROP CONSTRAINT "DatasetEvalResult_comparisonOutputSourceId_fkey";

-- DropForeignKey
ALTER TABLE "DatasetEvalResult" DROP CONSTRAINT "DatasetEvalResult_datasetEvalDatasetEntryId_fkey";

-- DropForeignKey
ALTER TABLE "DatasetEvalResult" DROP CONSTRAINT "DatasetEvalResult_datasetEvalOutputSourceId_fkey";

-- DropForeignKey
ALTER TABLE "FineTuneTestingEntry" DROP CONSTRAINT "FineTuneTestingEntry_datasetEntryId_fkey";

-- DropForeignKey
ALTER TABLE "FineTuneTestingEntry" DROP CONSTRAINT "FineTuneTestingEntry_fineTuneId_fkey";

-- DropForeignKey
ALTER TABLE "FineTuneTrainingEntry" DROP CONSTRAINT "FineTuneTrainingEntry_datasetEntryId_fkey";

-- DropForeignKey
ALTER TABLE "FineTuneTrainingEntry" DROP CONSTRAINT "FineTuneTrainingEntry_fineTuneId_fkey";

-- DropForeignKey
ALTER TABLE "PruningRuleMatch" DROP CONSTRAINT "PruningRuleMatch_datasetEntryId_fkey";

-- DropForeignKey
ALTER TABLE "PruningRuleMatch" DROP CONSTRAINT "PruningRuleMatch_pruningRuleId_fkey";

-- DropTable
DROP TABLE "DatasetEntry";

-- DropTable
DROP TABLE "DatasetEvalDatasetEntry";

-- DropTable
DROP TABLE "DatasetEvalResult";

-- DropTable
DROP TABLE "FineTuneTestingEntry";

-- DropTable
DROP TABLE "FineTuneTrainingEntry";

-- DropTable
DROP TABLE "PruningRuleMatch";

-- DropTable
DROP TABLE "RelabelRequest";

-- DropEnum
DROP TYPE "RelabelRequestStatus";


-- Rename NewPruningRuleMatch to PruningRuleMatch
ALTER TABLE "NewPruningRuleMatch" RENAME TO "PruningRuleMatch";
ALTER TABLE "PruningRuleMatch" RENAME CONSTRAINT "NewPruningRuleMatch_pkey" TO "PruningRuleMatch_pkey";
ALTER TABLE "PruningRuleMatch" RENAME CONSTRAINT "NewPruningRuleMatch_pruningRuleId_fkey" TO "PruningRuleMatch_pruningRuleId_fkey";
ALTER INDEX "NewPruningRuleMatch_pruningRuleId_idx" RENAME TO "PruningRuleMatch_pruningRuleId_idx";
ALTER INDEX "NewPruningRuleMatch_inputHash_pruningRuleId_key" RENAME TO "PruningRuleMatch_inputHash_pruningRuleId_key";

-- Rename NewFineTuneTestingEntry to FineTuneTestingEntry
ALTER TABLE "NewFineTuneTestingEntry" RENAME TO "FineTuneTestingEntry";
ALTER TABLE "FineTuneTestingEntry" RENAME CONSTRAINT "NewFineTuneTestingEntry_pkey" TO "FineTuneTestingEntry_pkey";
ALTER TABLE "FineTuneTestingEntry" RENAME CONSTRAINT "NewFineTuneTestingEntry_fineTuneId_fkey" TO "FineTuneTestingEntry_fineTuneId_fkey";
ALTER TABLE "FineTuneTestingEntry" RENAME CONSTRAINT "NewFineTuneTestingEntry_projectId_fkey" TO "FineTuneTestingEntry_projectId_fkey";
ALTER INDEX "NewFineTuneTestingEntry_fineTuneId_idx" RENAME TO "FineTuneTestingEntry_fineTuneId_idx";
ALTER INDEX "NewFineTuneTestingEntry_projectId_idx" RENAME TO "FineTuneTestingEntry_projectId_idx";
ALTER INDEX "NewFineTuneTestingEntry_inputHash_modelId_key" RENAME TO "FineTuneTestingEntry_inputHash_modelId_key";

-- Rename NewFineTuneTrainingEntry to FineTuneTrainingEntry
ALTER TABLE "NewFineTuneTrainingEntry" RENAME TO "FineTuneTrainingEntry";
ALTER TABLE "FineTuneTrainingEntry" RENAME CONSTRAINT "NewFineTuneTrainingEntry_pkey" TO "FineTuneTrainingEntry_pkey";
ALTER TABLE "FineTuneTrainingEntry" RENAME CONSTRAINT "NewFineTuneTrainingEntry_fineTuneId_fkey" TO "FineTuneTrainingEntry_fineTuneId_fkey";
ALTER INDEX "NewFineTuneTrainingEntry_fineTuneId_createdAt_id_idx" RENAME TO "FineTuneTrainingEntry_fineTuneId_createdAt_id_idx";
ALTER INDEX "NewFineTuneTrainingEntry_nodeEntryPersistentId_fineTuneId_key" RENAME TO "FineTuneTrainingEntry_nodeEntryPersistentId_fineTuneId_key";


-- Rename NewDatasetEvalResult to DatasetEvalResult
ALTER TABLE "NewDatasetEvalResult" RENAME TO "DatasetEvalResult";
ALTER TABLE "DatasetEvalResult" RENAME CONSTRAINT "NewDatasetEvalResult_pkey" TO "DatasetEvalResult_pkey";
ALTER TABLE "DatasetEvalResult" RENAME CONSTRAINT "NewDatasetEvalResult_comparisonOutputSourceId_fkey" TO "DatasetEvalResult_comparisonOutputSourceId_fkey";
ALTER TABLE "DatasetEvalResult" RENAME CONSTRAINT "NewDatasetEvalResult_datasetEvalNodeEntryId_fkey" TO "DatasetEvalResult_datasetEvalNodeEntryId_fkey";
ALTER TABLE "DatasetEvalResult" RENAME CONSTRAINT "NewDatasetEvalResult_datasetEvalOutputSourceId_fkey" TO "DatasetEvalResult_datasetEvalOutputSourceId_fkey";
ALTER INDEX "NewDatasetEvalResult_nodeEntryInputHash_nodeEntryOutputHash_idx" RENAME TO "DatasetEvalResult_nodeEntryInputHash_nodeEntryOutputHash_da_idx";
ALTER INDEX "NewDatasetEvalResult_comparisonResultId_idx" RENAME TO "DatasetEvalResult_comparisonResultId_idx";
ALTER INDEX "NewDatasetEvalResult_datasetEvalNodeEntryId_nodeEntryInputH_key" RENAME TO "DatasetEvalResult_datasetEvalNodeEntryId_nodeEntryInputHash_key";


-- Update NodeEntry Indexes
DROP INDEX "NodeEntry_nodeId_inputHash_persistentId_idx";
DROP INDEX "NodeEntry_nodeId_status_updatedAt_idx";
CREATE INDEX "NodeEntry_nodeId_persistentId_idx" ON "NodeEntry"("nodeId", "persistentId");
CREATE INDEX "NodeEntry_nodeId_status_inputHash_idx" ON "NodeEntry"("nodeId", "status", "inputHash");

-- Update Dataset nodeId to not null
ALTER TABLE "Dataset" DROP CONSTRAINT "Dataset_nodeId_fkey";
ALTER TABLE "Dataset" ALTER COLUMN "nodeId" SET NOT NULL;
ALTER TABLE "Dataset" ADD CONSTRAINT "Dataset_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "Node"("id") ON DELETE CASCADE ON UPDATE CASCADE;


/* Drop nodeId from NodeEntry table */

-- DropForeignKey
ALTER TABLE "NodeEntry" DROP CONSTRAINT "NodeEntry_nodeId_fkey";

-- DropIndex
DROP INDEX "NodeEntry_dataChannelId_idx";

-- DropIndex
DROP INDEX "NodeEntry_nodeId_persistentId_idx";

-- DropIndex
DROP INDEX "NodeEntry_nodeId_status_inputHash_idx";

-- DropIndex
DROP INDEX "NodeEntry_persistentId_nodeId_idx";

-- AlterTable
ALTER TABLE "NodeEntry" DROP COLUMN "nodeId";

-- CreateIndex
CREATE INDEX "NodeEntry_dataChannelId_persistentId_idx" ON "NodeEntry"("dataChannelId", "persistentId");

-- CreateIndex
CREATE INDEX "NodeEntry_dataChannelId_inputHash_idx" ON "NodeEntry"("dataChannelId", "inputHash");

-- CreateIndex
CREATE INDEX "DataChannel_destinationId_id_idx" ON "DataChannel"("destinationId", "id");
