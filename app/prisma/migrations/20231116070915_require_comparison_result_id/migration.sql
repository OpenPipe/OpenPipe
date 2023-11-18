/*
  Warnings:

  - Made the column `comparisonResultId` on table `DatasetEvalResult` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "DatasetEvalResult" ALTER COLUMN "comparisonResultId" SET NOT NULL;
