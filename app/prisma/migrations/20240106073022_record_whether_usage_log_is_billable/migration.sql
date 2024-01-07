-- AlterTable
ALTER TABLE "UsageLog" ADD COLUMN     "billable" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE INDEX "FineTuneTestingEntry_fineTuneId_idx" ON "FineTuneTestingEntry"("fineTuneId");
