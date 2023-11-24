-- CreateEnum
CREATE TYPE "DatasetEvalType" AS ENUM ('FIELD_COMPARISON', 'HEAD_TO_HEAD');

-- CreateEnum
CREATE TYPE "DatasetEvalResultStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETE', 'ERROR');

-- CreateTable
CREATE TABLE "DatasetEval" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "instructions" TEXT,
    "type" "DatasetEvalType" NOT NULL DEFAULT 'HEAD_TO_HEAD',
    "datasetId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DatasetEval_pkey" PRIMARY KEY ("id")
);

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
    "modelId" TEXT NOT NULL,
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
    "errorMessage" TEXT,
    "status" "DatasetEvalResultStatus" NOT NULL DEFAULT 'PENDING',
    "comparisonResultId" UUID,
    "comparisonOutputSourceId" UUID,
    "datasetEvalDatasetEntryId" UUID NOT NULL,
    "datasetEvalOutputSourceId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DatasetEvalResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DatasetEval_datasetId_name_key" ON "DatasetEval"("datasetId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "DatasetEvalDatasetEntry_datasetEvalId_datasetEntryId_key" ON "DatasetEvalDatasetEntry"("datasetEvalId", "datasetEntryId");

-- CreateIndex
CREATE UNIQUE INDEX "DatasetEvalOutputSource_datasetEvalId_modelId_key" ON "DatasetEvalOutputSource"("datasetEvalId", "modelId");

-- CreateIndex
CREATE INDEX "DatasetEvalResult_comparisonResultId_idx" ON "DatasetEvalResult"("comparisonResultId");

-- CreateIndex
CREATE UNIQUE INDEX "DatasetEvalResult_datasetEvalDatasetEntryId_datasetEvalOutp_key" ON "DatasetEvalResult"("datasetEvalDatasetEntryId", "datasetEvalOutputSourceId", "comparisonOutputSourceId");

-- CreateIndex
CREATE INDEX "DatasetEntry_persistentId_createdAt_idx" ON "DatasetEntry"("persistentId", "createdAt");

-- AddForeignKey
ALTER TABLE "DatasetEval" ADD CONSTRAINT "DatasetEval_datasetId_fkey" FOREIGN KEY ("datasetId") REFERENCES "Dataset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DatasetEvalDatasetEntry" ADD CONSTRAINT "DatasetEvalDatasetEntry_datasetEvalId_fkey" FOREIGN KEY ("datasetEvalId") REFERENCES "DatasetEval"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DatasetEvalDatasetEntry" ADD CONSTRAINT "DatasetEvalDatasetEntry_datasetEntryId_fkey" FOREIGN KEY ("datasetEntryId") REFERENCES "DatasetEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DatasetEvalOutputSource" ADD CONSTRAINT "DatasetEvalOutputSource_datasetEvalId_fkey" FOREIGN KEY ("datasetEvalId") REFERENCES "DatasetEval"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DatasetEvalResult" ADD CONSTRAINT "DatasetEvalResult_comparisonOutputSourceId_fkey" FOREIGN KEY ("comparisonOutputSourceId") REFERENCES "DatasetEvalOutputSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DatasetEvalResult" ADD CONSTRAINT "DatasetEvalResult_datasetEvalDatasetEntryId_fkey" FOREIGN KEY ("datasetEvalDatasetEntryId") REFERENCES "DatasetEvalDatasetEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DatasetEvalResult" ADD CONSTRAINT "DatasetEvalResult_datasetEvalOutputSourceId_fkey" FOREIGN KEY ("datasetEvalOutputSourceId") REFERENCES "DatasetEvalOutputSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;
