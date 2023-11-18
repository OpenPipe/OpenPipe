/*
  Warnings:

  - You are about to drop the column `evalRunId` on the `DatasetEvalResult` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[datasetEvalDatasetEntryId,datasetEvalOutputSourceId,comparisonResultId]` on the table `DatasetEvalResult` will be added. If there are existing duplicate values, this will fail.
  - Made the column `modelId` on table `DatasetEvalOutputSource` required. This step will fail if there are existing NULL values in that column.

*/
-- DropIndex
DROP INDEX "DatasetEvalResult_datasetEvalDatasetEntryId_datasetEvalOutp_key";

-- DropIndex
DROP INDEX "DatasetEvalResult_evalRunId_idx";

-- AlterTable
ALTER TABLE "DatasetEvalOutputSource" ALTER COLUMN "modelId" SET NOT NULL;

-- AlterTable
ALTER TABLE "DatasetEvalResult" DROP COLUMN "evalRunId",
ADD COLUMN     "comparisonResultId" UUID;

-- CreateIndex
CREATE UNIQUE INDEX "DatasetEvalResult_datasetEvalDatasetEntryId_datasetEvalOutp_key" ON "DatasetEvalResult"("datasetEvalDatasetEntryId", "datasetEvalOutputSourceId", "comparisonResultId");
