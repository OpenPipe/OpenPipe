-- CreateIndex
CREATE INDEX "LoggedCall_projectId_idx" ON "LoggedCall"("projectId");

-- CreateIndex
CREATE INDEX "LoggedCall_projectId_requestedAt_idx" ON "LoggedCall"("projectId", "requestedAt");

-- CreateIndex
CREATE INDEX "LoggedCallModelResponse_originalLoggedCallId_idx" ON "LoggedCallModelResponse"("originalLoggedCallId");

-- CreateIndex
CREATE INDEX "LoggedCallTag_loggedCallId_idx" ON "LoggedCallTag"("loggedCallId");

-- DropIndex
DROP INDEX "LoggedCall_requestedAt_idx";
