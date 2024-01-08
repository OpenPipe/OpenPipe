-- AlterTable
ALTER TABLE "FineTune" ADD COLUMN     "numTrainingAutoretries" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "FineTuneTrainingEntry_fineTuneId_idx" ON "FineTuneTrainingEntry"("fineTuneId");
