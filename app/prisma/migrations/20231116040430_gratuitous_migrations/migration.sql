/*
  Warnings:

  - A unique constraint covering the columns `[datasetEvalDatasetEntryId,datasetEvalOutputSourceId,evalRunId]` on the table `DatasetEvalResult` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "DatasetEvalResult_datasetEvalDatasetEntryId_datasetEvalOutp_key";

-- CreateIndex
CREATE UNIQUE INDEX "DatasetEvalResult_datasetEvalDatasetEntryId_datasetEvalOutp_key" ON "DatasetEvalResult"("datasetEvalDatasetEntryId", "datasetEvalOutputSourceId", "evalRunId");
