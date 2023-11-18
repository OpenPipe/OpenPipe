/*
  Warnings:

  - You are about to drop the `DatasetEvalScore` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "DatasetEvalResultStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETE', 'ERROR');

-- DropForeignKey
ALTER TABLE "DatasetEvalScore" DROP CONSTRAINT "DatasetEvalScore_datasetEntryId_fkey";

-- DropForeignKey
ALTER TABLE "DatasetEvalScore" DROP CONSTRAINT "DatasetEvalScore_datasetEvalId_fkey";

-- DropForeignKey
ALTER TABLE "DatasetEvalScore" DROP CONSTRAINT "DatasetEvalScore_fineTuneId_fkey";

-- DropForeignKey
ALTER TABLE "DatasetEvalScore" DROP CONSTRAINT "DatasetEvalScore_fineTuneTestingEntryId_fkey";

-- DropTable
DROP TABLE "DatasetEvalScore";

-- CreateTable
CREATE TABLE "DatasetEvalDatasetEntry" (
    "id" UUID NOT NULL,
    "datasetEvalId" UUID NOT NULL,
    "datasetEntryId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DatasetEvalDatasetEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DatasetEvalOutputSource" (
    "id" UUID NOT NULL,
    "outputSourceId" TEXT,
    "datasetEvalId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DatasetEvalOutputSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DatasetEvalResult" (
    "id" UUID NOT NULL,
    "score" DOUBLE PRECISION,
    "explanation" TEXT,
    "evalRunId" TEXT,
    "errorMessage" TEXT,
    "status" "DatasetEvalResultStatus" NOT NULL DEFAULT 'PENDING',
    "datasetEvalDatasetEntryId" UUID NOT NULL,
    "datasetEvalOutputSourceId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DatasetEvalResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DatasetEvalDatasetEntry_datasetEvalId_datasetEntryId_key" ON "DatasetEvalDatasetEntry"("datasetEvalId", "datasetEntryId");

-- CreateIndex
CREATE UNIQUE INDEX "DatasetEvalOutputSource_datasetEvalId_outputSourceId_key" ON "DatasetEvalOutputSource"("datasetEvalId", "outputSourceId");

-- CreateIndex
CREATE INDEX "DatasetEvalResult_evalRunId_idx" ON "DatasetEvalResult"("evalRunId");

-- CreateIndex
CREATE UNIQUE INDEX "DatasetEvalResult_datasetEvalDatasetEntryId_datasetEvalOutp_key" ON "DatasetEvalResult"("datasetEvalDatasetEntryId", "datasetEvalOutputSourceId");

-- AddForeignKey
ALTER TABLE "DatasetEvalDatasetEntry" ADD CONSTRAINT "DatasetEvalDatasetEntry_datasetEvalId_fkey" FOREIGN KEY ("datasetEvalId") REFERENCES "DatasetEval"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DatasetEvalDatasetEntry" ADD CONSTRAINT "DatasetEvalDatasetEntry_datasetEntryId_fkey" FOREIGN KEY ("datasetEntryId") REFERENCES "DatasetEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DatasetEvalOutputSource" ADD CONSTRAINT "DatasetEvalOutputSource_datasetEvalId_fkey" FOREIGN KEY ("datasetEvalId") REFERENCES "DatasetEval"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DatasetEvalResult" ADD CONSTRAINT "DatasetEvalResult_datasetEvalDatasetEntryId_fkey" FOREIGN KEY ("datasetEvalDatasetEntryId") REFERENCES "DatasetEvalDatasetEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DatasetEvalResult" ADD CONSTRAINT "DatasetEvalResult_datasetEvalOutputSourceId_fkey" FOREIGN KEY ("datasetEvalOutputSourceId") REFERENCES "DatasetEvalOutputSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;
