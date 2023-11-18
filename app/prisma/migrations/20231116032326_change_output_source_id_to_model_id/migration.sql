/*
  Warnings:

  - You are about to drop the column `outputSourceId` on the `DatasetEvalOutputSource` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[datasetEvalId,modelId]` on the table `DatasetEvalOutputSource` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "DatasetEvalOutputSource_datasetEvalId_outputSourceId_key";

-- AlterTable
ALTER TABLE "DatasetEvalOutputSource" DROP COLUMN "outputSourceId",
ADD COLUMN     "modelId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "DatasetEvalOutputSource_datasetEvalId_modelId_key" ON "DatasetEvalOutputSource"("datasetEvalId", "modelId");
