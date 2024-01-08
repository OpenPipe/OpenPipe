-- CreateIndex
CREATE INDEX "FineTuneTrainingEntry_fineTuneId_idx" ON "FineTuneTrainingEntry"("fineTuneId");

-- CreateIndex
CREATE INDEX "LoggedCallTag_name_projectId_idx" ON "LoggedCallTag"("name", "projectId");
