/*
  Warnings:

  - A unique constraint covering the columns `[datasetEvalDatasetEntryId,datasetEvalOutputSourceId,comparisonOutputSourceId]` on the table `DatasetEvalResult` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `comparisonOutputSourceId` to the `DatasetEvalResult` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "DatasetEvalResult_datasetEvalDatasetEntryId_datasetEvalOutp_key";

-- AlterTable
ALTER TABLE "DatasetEvalResult" ADD COLUMN     "comparisonOutputSourceId" UUID NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "DatasetEvalResult_datasetEvalDatasetEntryId_datasetEvalOutp_key" ON "DatasetEvalResult"("datasetEvalDatasetEntryId", "datasetEvalOutputSourceId", "comparisonOutputSourceId");
