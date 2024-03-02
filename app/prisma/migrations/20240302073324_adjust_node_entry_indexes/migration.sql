-- DropIndex
DROP INDEX "NodeEntry_nodeId_inputHash_persistentId_idx";

-- DropIndex
DROP INDEX "NodeEntry_nodeId_status_updatedAt_idx";

-- CreateIndex
CREATE INDEX "NodeEntry_nodeId_persistentId_idx" ON "NodeEntry"("nodeId", "persistentId");

-- CreateIndex
CREATE INDEX "NodeEntry_nodeId_status_inputHash_idx" ON "NodeEntry"("nodeId", "status", "inputHash");
