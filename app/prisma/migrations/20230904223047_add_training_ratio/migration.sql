/*
  Warnings:

  - You are about to drop the column `testingDatasetId` on the `FineTune` table. All the data in the column will be lost.
  - You are about to drop the column `trainingDatasetId` on the `FineTune` table. All the data in the column will be lost.
  - Added the required column `type` to the `DatasetEntry` table without a default value. This is not possible if the table is not empty.
  - Added the required column `datasetId` to the `FineTune` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "DatasetEntryType" AS ENUM ('TRAIN', 'TEST');

-- DropForeignKey
ALTER TABLE "FineTune" DROP CONSTRAINT "FineTune_testingDatasetId_fkey";

-- DropForeignKey
ALTER TABLE "FineTune" DROP CONSTRAINT "FineTune_trainingDatasetId_fkey";

-- AlterTable
ALTER TABLE "Dataset" ADD COLUMN     "trainingRatio" DOUBLE PRECISION NOT NULL DEFAULT 0.8;

-- AlterTable
ALTER TABLE "DatasetEntry" ADD COLUMN     "type" "DatasetEntryType" NOT NULL;

-- AlterTable
ALTER TABLE "FineTune" DROP COLUMN "testingDatasetId",
DROP COLUMN "trainingDatasetId",
ADD COLUMN     "datasetId" UUID NOT NULL;

-- AddForeignKey
ALTER TABLE "FineTune" ADD CONSTRAINT "FineTune_datasetId_fkey" FOREIGN KEY ("datasetId") REFERENCES "Dataset"("id") ON DELETE CASCADE ON UPDATE CASCADE;
