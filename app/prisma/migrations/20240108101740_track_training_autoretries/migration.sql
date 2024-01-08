-- AlterTable
ALTER TABLE "FineTune" ADD COLUMN     "numTrainingAutoretries" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "FineTuneTrainingEntry_fineTuneId_idx" ON "FineTuneTrainingEntry"("fineTuneId");

-- CreateIndex
CREATE INDEX "LoggedCallTag_name_projectId_idx" ON "LoggedCallTag"("name", "projectId");
