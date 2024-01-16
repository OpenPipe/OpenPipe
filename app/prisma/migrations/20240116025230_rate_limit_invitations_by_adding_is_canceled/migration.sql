-- DropIndex
DROP INDEX "UserInvitation_projectId_email_key";

-- AlterTable
ALTER TABLE "UserInvitation" ADD COLUMN     "isCanceled" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "UserInvitation_projectId_email_idx" ON "UserInvitation"("projectId", "email");
