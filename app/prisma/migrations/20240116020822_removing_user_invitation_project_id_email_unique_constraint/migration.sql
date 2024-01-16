-- DropIndex
DROP INDEX "UserInvitation_projectId_email_key";

-- CreateIndex
CREATE INDEX "UserInvitation_projectId_email_idx" ON "UserInvitation"("projectId", "email");
