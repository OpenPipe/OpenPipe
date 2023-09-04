/*
  Warnings:

  - You are about to drop the column `datasetId` on the `FineTune` table. All the data in the column will be lost.
  - Added the required column `testingDatasetId` to the `FineTune` table without a default value. This is not possible if the table is not empty.
  - Added the required column `trainingDatasetId` to the `FineTune` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "FineTune" DROP CONSTRAINT "FineTune_datasetId_fkey";

-- AlterTable
ALTER TABLE "FineTune" DROP COLUMN "datasetId",
ADD COLUMN     "testingDatasetId" UUID NOT NULL,
ADD COLUMN     "trainingDatasetId" UUID NOT NULL;

-- AddForeignKey
ALTER TABLE "FineTune" ADD CONSTRAINT "FineTune_trainingDatasetId_fkey" FOREIGN KEY ("trainingDatasetId") REFERENCES "Dataset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FineTune" ADD CONSTRAINT "FineTune_testingDatasetId_fkey" FOREIGN KEY ("testingDatasetId") REFERENCES "Dataset"("id") ON DELETE CASCADE ON UPDATE CASCADE;
