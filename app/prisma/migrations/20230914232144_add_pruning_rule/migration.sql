-- CreateTable
CREATE TABLE "PruningRule" (
    "id" UUID NOT NULL,
    "textToMatch" TEXT NOT NULL,
    "tokensInText" INTEGER NOT NULL,
    "datasetId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PruningRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PruningRuleMatch" (
    "id" UUID NOT NULL,
    "pruningRuleId" UUID NOT NULL,
    "datasetEntryId" UUID NOT NULL,

    CONSTRAINT "PruningRuleMatch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PruningRule_datasetId_createdAt_id_idx" ON "PruningRule"("datasetId", "createdAt", "id");

-- CreateIndex
CREATE UNIQUE INDEX "PruningRuleMatch_pruningRuleId_datasetEntryId_key" ON "PruningRuleMatch"("pruningRuleId", "datasetEntryId");

-- AddForeignKey
ALTER TABLE "PruningRule" ADD CONSTRAINT "PruningRule_datasetId_fkey" FOREIGN KEY ("datasetId") REFERENCES "Dataset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PruningRuleMatch" ADD CONSTRAINT "PruningRuleMatch_pruningRuleId_fkey" FOREIGN KEY ("pruningRuleId") REFERENCES "PruningRule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PruningRuleMatch" ADD CONSTRAINT "PruningRuleMatch_datasetEntryId_fkey" FOREIGN KEY ("datasetEntryId") REFERENCES "DatasetEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
