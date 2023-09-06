/*
  Warnings:

  - Added the required column `inputTokens` to the `DatasetEntry` table without a default value. This is not possible if the table is not empty.
  - Added the required column `outputTokens` to the `DatasetEntry` table without a default value. This is not possible if the table is not empty.
  - Added the required column `type` to the `DatasetEntry` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "DatasetEntryType" AS ENUM ('TRAIN', 'TEST');

-- AlterTable
ALTER TABLE "Dataset" ADD COLUMN     "trainingRatio" DOUBLE PRECISION NOT NULL DEFAULT 0.8;

-- AlterTable
ALTER TABLE "DatasetEntry" ADD COLUMN     "input" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "inputTokens" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "output" JSONB,
ADD COLUMN     "outputTokens" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "type" "DatasetEntryType" NOT NULL DEFAULT 'TRAIN';

-- CreateIndex
CREATE INDEX "DatasetEntry_datasetId_createdAt_id_idx" ON "DatasetEntry"("datasetId", "createdAt", "id");

-- CreateIndex
CREATE INDEX "DatasetEntry_datasetId_type_idx" ON "DatasetEntry"("datasetId", "type");
