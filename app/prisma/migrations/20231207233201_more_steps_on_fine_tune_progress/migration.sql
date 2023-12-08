/*
  Warnings:

  - A unique constraint covering the columns `[datasetEntryId,fineTuneId]` on the table `FineTuneTrainingEntry` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterEnum
ALTER TYPE "FineTuneStatus" ADD VALUE 'STARTED';

-- CreateIndex
CREATE UNIQUE INDEX "FineTuneTrainingEntry_datasetEntryId_fineTuneId_key" ON "FineTuneTrainingEntry"("datasetEntryId", "fineTuneId");
