-- CreateTable
CREATE TABLE "FineTuneTestingEntry" (
    "id" UUID NOT NULL,
    "inputTokens" INTEGER NOT NULL,
    "responseId" UUID,
    "fineTuneId" UUID NOT NULL,
    "datasetEntryId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FineTuneTestingEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FineTuneResponse" (
    "id" UUID NOT NULL,
    "cacheKey" TEXT,
    "outputTokens" INTEGER NOT NULL,
    "output" JSONB,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FineTuneResponse_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FineTuneTestingEntry_fineTuneId_datasetEntryId_key" ON "FineTuneTestingEntry"("fineTuneId", "datasetEntryId");

-- AddForeignKey
ALTER TABLE "FineTuneTestingEntry" ADD CONSTRAINT "FineTuneTestingEntry_responseId_fkey" FOREIGN KEY ("responseId") REFERENCES "FineTuneResponse"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FineTuneTestingEntry" ADD CONSTRAINT "FineTuneTestingEntry_fineTuneId_fkey" FOREIGN KEY ("fineTuneId") REFERENCES "FineTune"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FineTuneTestingEntry" ADD CONSTRAINT "FineTuneTestingEntry_datasetEntryId_fkey" FOREIGN KEY ("datasetEntryId") REFERENCES "DatasetEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
