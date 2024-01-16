-- DropForeignKey
ALTER TABLE "DatasetEntry" DROP CONSTRAINT "DatasetEntry_loggedCallId_fkey";

-- CreateIndex
CREATE INDEX "DatasetEntry_loggedCallId_idx" ON "DatasetEntry"("loggedCallId");

-- AddForeignKey
ALTER TABLE "DatasetEntry" ADD CONSTRAINT "DatasetEntry_loggedCallId_fkey" FOREIGN KEY ("loggedCallId") REFERENCES "LoggedCall"("id") ON DELETE SET NULL ON UPDATE CASCADE;
