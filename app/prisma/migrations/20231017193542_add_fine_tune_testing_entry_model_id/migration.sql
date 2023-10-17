/*
  Warnings:

  - A unique constraint covering the columns `[modelId,datasetEntryId]` on the table `FineTuneTestingEntry` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `modelId` to the `FineTuneTestingEntry` table without a default value.
  - You are about to drop the column `prunedInput` on the `FineTuneTestingEntry` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "ComparisonModel" AS ENUM ('GPT_3_5_TURBO');

-- DropIndex
DROP INDEX "FineTuneTestingEntry_fineTuneId_datasetEntryId_key";

-- AlterTable
ALTER TABLE "Dataset" ADD COLUMN "enabledComparisonModels" "ComparisonModel"[] DEFAULT ARRAY[]::"ComparisonModel"[];

-- AlterTable
ALTER TABLE "FineTuneTestingEntry" ALTER COLUMN "prunedInputTokens" DROP NOT NULL;

-- AlterTable
ALTER TABLE "FineTuneTestingEntry" DROP COLUMN "prunedInput";

-- AlterTable: Add modelId without NOT NULL constraint
ALTER TABLE "FineTuneTestingEntry" ADD COLUMN "modelId" TEXT;

-- Update modelId with the values from fineTuneId
UPDATE "FineTuneTestingEntry" SET "modelId" = "fineTuneId";

-- Alter the new column to add the NOT NULL constraint
ALTER TABLE "FineTuneTestingEntry" ALTER COLUMN "modelId" SET NOT NULL;

-- Alter fineTuneId column
ALTER TABLE "FineTuneTestingEntry" ALTER COLUMN "fineTuneId" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "FineTuneTestingEntry_modelId_datasetEntryId_key" ON "FineTuneTestingEntry"("modelId", "datasetEntryId");
