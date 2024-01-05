-- DropForeignKey
ALTER TABLE "UsageLog" DROP CONSTRAINT "UsageLog_fineTuneId_fkey";

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "isHidden" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "UsageLog" ADD COLUMN     "projectId" UUID,
ALTER COLUMN "fineTuneId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "UsageLog_projectId_createdAt_type_idx" ON "UsageLog"("projectId", "createdAt", "type");

-- AddForeignKey
ALTER TABLE "UsageLog" ADD CONSTRAINT "UsageLog_fineTuneId_fkey" FOREIGN KEY ("fineTuneId") REFERENCES "FineTune"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsageLog" ADD CONSTRAINT "UsageLog_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
