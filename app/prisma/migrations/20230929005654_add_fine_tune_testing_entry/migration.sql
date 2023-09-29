-- CreateTable
CREATE TABLE "FineTuneTestingEntry" (
    "id" UUID NOT NULL,
    "cacheKey" TEXT,
    "prunedInputTokens" INTEGER NOT NULL,
    "prunedInput" TEXT NOT NULL,
    "outputTokens" INTEGER,
    "output" JSONB,
    "errorMessage" TEXT,
    "fineTuneId" UUID NOT NULL,
    "datasetEntryId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FineTuneTestingEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FineTuneTestingEntry_cacheKey_idx" ON "FineTuneTestingEntry"("cacheKey");

-- CreateIndex
CREATE UNIQUE INDEX "FineTuneTestingEntry_fineTuneId_datasetEntryId_key" ON "FineTuneTestingEntry"("fineTuneId", "datasetEntryId");

-- AddForeignKey
ALTER TABLE "FineTuneTestingEntry" ADD CONSTRAINT "FineTuneTestingEntry_fineTuneId_fkey" FOREIGN KEY ("fineTuneId") REFERENCES "FineTune"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FineTuneTestingEntry" ADD CONSTRAINT "FineTuneTestingEntry_datasetEntryId_fkey" FOREIGN KEY ("datasetEntryId") REFERENCES "DatasetEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
