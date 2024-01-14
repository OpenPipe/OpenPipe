/*
  Warnings:

  - A unique constraint covering the columns `[datasetEntryPersistentId,batchId]` on the table `RelabelRequest` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "RelabelRequest_batchId_datasetEntryPersistentId_key";

-- CreateIndex
CREATE UNIQUE INDEX "RelabelRequest_datasetEntryPersistentId_batchId_key" ON "RelabelRequest"("datasetEntryPersistentId", "batchId");
