-- CreateIndex
CREATE INDEX "LoggedCall_projectId_model_statusCode_idx" ON "LoggedCall"("projectId", "model", "statusCode");
