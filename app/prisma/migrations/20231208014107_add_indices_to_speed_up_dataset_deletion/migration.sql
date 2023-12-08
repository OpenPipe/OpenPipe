-- CreateIndex
CREATE INDEX "DatasetEvalDatasetEntry_datasetEntryId_idx" ON "DatasetEvalDatasetEntry"("datasetEntryId");

-- CreateIndex
CREATE INDEX "FineTuneTestingEntry_datasetEntryId_idx" ON "FineTuneTestingEntry"("datasetEntryId");

-- CreateIndex
CREATE INDEX "FineTuneTrainingEntry_datasetEntryId_fineTuneId_idx" ON "FineTuneTrainingEntry"("datasetEntryId", "fineTuneId");

-- CreateIndex
CREATE INDEX "PruningRuleMatch_datasetEntryId_idx" ON "PruningRuleMatch"("datasetEntryId");
