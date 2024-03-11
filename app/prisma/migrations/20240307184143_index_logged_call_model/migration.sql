-- DropIndex
DROP INDEX "LoggedCall_projectId_idx";

-- DropIndex
DROP INDEX "LoggedCall_projectId_updatedAt_idx";

-- CreateIndex
CREATE INDEX "LoggedCall_projectId_model_updatedAt_idx" ON "LoggedCall"("projectId", "model", "updatedAt");
