-- CreateTable
CREATE TABLE "DatasetEval" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "instructions" TEXT,
    "datasetId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DatasetEval_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DatasetEvalScore" (
    "id" UUID NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "explanation" TEXT,
    "evalRunId" TEXT,
    "datasetEvalId" UUID NOT NULL,
    "datasetEntryId" UUID NOT NULL,
    "fineTuneTestingEntryId" UUID,
    "fineTuneId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DatasetEvalScore_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DatasetEval_datasetId_name_key" ON "DatasetEval"("datasetId", "name");

-- CreateIndex
CREATE INDEX "DatasetEvalScore_evalRunId_idx" ON "DatasetEvalScore"("evalRunId");

-- CreateIndex
CREATE UNIQUE INDEX "DatasetEvalScore_datasetEvalId_datasetEntryId_fineTuneId_key" ON "DatasetEvalScore"("datasetEvalId", "datasetEntryId", "fineTuneId");

-- CreateIndex
CREATE INDEX "DatasetEntry_persistentId_createdAt_idx" ON "DatasetEntry"("persistentId", "createdAt");

-- AddForeignKey
ALTER TABLE "DatasetEval" ADD CONSTRAINT "DatasetEval_datasetId_fkey" FOREIGN KEY ("datasetId") REFERENCES "Dataset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DatasetEvalScore" ADD CONSTRAINT "DatasetEvalScore_datasetEvalId_fkey" FOREIGN KEY ("datasetEvalId") REFERENCES "DatasetEval"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DatasetEvalScore" ADD CONSTRAINT "DatasetEvalScore_datasetEntryId_fkey" FOREIGN KEY ("datasetEntryId") REFERENCES "DatasetEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DatasetEvalScore" ADD CONSTRAINT "DatasetEvalScore_fineTuneTestingEntryId_fkey" FOREIGN KEY ("fineTuneTestingEntryId") REFERENCES "FineTuneTestingEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DatasetEvalScore" ADD CONSTRAINT "DatasetEvalScore_fineTuneId_fkey" FOREIGN KEY ("fineTuneId") REFERENCES "FineTune"("id") ON DELETE CASCADE ON UPDATE CASCADE;
