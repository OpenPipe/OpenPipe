-- CreateEnum
CREATE TYPE "LoggedCallProcessingStatus" AS ENUM ('PENDING', 'PROCESSING', 'PROCESSED');

-- CreateEnum
CREATE TYPE "MonitorMatchStatus" AS ENUM ('PENDING', 'IN_REVIEW', 'MATCH');

-- CreateEnum
CREATE TYPE "NodeType" AS ENUM ('Monitor', 'StaticDataset', 'Filter', 'LLMFilter', 'LLMRelabel', 'ManualRelabel', 'Dataset');

-- CreateEnum
CREATE TYPE "NodeDataStatus" AS ENUM ('PENDING', 'PROCESSING', 'ERROR', 'PROCESSED');

-- CreateEnum
CREATE TYPE "NewDatasetEntryProvenance" AS ENUM ('RequestLog', 'StaticDataset', 'ManualRelabel', 'LLMRelabel');

-- AlterTable
ALTER TABLE "Dataset" ADD COLUMN     "nodeId" UUID;

-- AlterTable
ALTER TABLE "DatasetFileUpload" ADD COLUMN     "nodeId" UUID,
ALTER COLUMN "datasetId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "LoggedCall" ADD COLUMN     "processingStatus" "LoggedCallProcessingStatus" NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "PruningRuleMatch" ADD COLUMN     "datasetEntryInputHash" TEXT,
ALTER COLUMN "datasetEntryId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "MonitorMatch" (
    "id" UUID NOT NULL,
    "checkPassed" BOOLEAN NOT NULL,
    "status" "MonitorMatchStatus" NOT NULL DEFAULT 'PENDING',
    "monitorId" UUID NOT NULL,
    "loggedCallId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MonitorMatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Node" (
    "id" UUID NOT NULL,
    "type" "NodeType" NOT NULL,
    "name" TEXT NOT NULL,
    "config" JSONB,
    "hash" TEXT NOT NULL,
    "maxEntriesPerMinute" INTEGER,
    "maxOutputSize" INTEGER,
    "projectId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Node_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NodeOutput" (
    "id" UUID NOT NULL,
    "label" TEXT NOT NULL,
    "nodeId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NodeOutput_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DataChannel" (
    "id" UUID NOT NULL,
    "originId" UUID,
    "destinationId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DataChannel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NodeData" (
    "id" UUID NOT NULL,
    "status" "NodeDataStatus" NOT NULL DEFAULT 'PENDING',
    "loggedCallId" UUID,
    "inputHash" TEXT NOT NULL,
    "outputHash" TEXT NOT NULL,
    "rejectedOutputHash" TEXT,
    "split" "DatasetEntrySplit" NOT NULL,
    "dataChannelId" UUID NOT NULL,
    "parentNodeDataId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NodeData_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DatasetEntryInput" (
    "function_call" JSONB,
    "functions" JSONB,
    "tool_choice" JSONB,
    "tools" JSONB,
    "messages" JSONB NOT NULL DEFAULT '[]',
    "response_format" JSONB,
    "inputTokens" INTEGER,
    "hash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "DatasetEntryOutput" (
    "output" JSONB,
    "hash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "CachedProcessedNodeData" (
    "id" UUID NOT NULL,
    "nodeHash" TEXT NOT NULL,
    "incomingDEIHash" TEXT NOT NULL,
    "incomingDEOHash" TEXT,
    "outgoingDEIHash" TEXT,
    "outgoingDEOHash" TEXT,
    "filterOutcome" TEXT,
    "explanation" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CachedProcessedNodeData_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MonitorMatch_monitorId_status_createdAt_idx" ON "MonitorMatch"("monitorId", "status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "MonitorMatch_monitorId_loggedCallId_key" ON "MonitorMatch"("monitorId", "loggedCallId");

-- CreateIndex
CREATE UNIQUE INDEX "DatasetEntryInput_hash_key" ON "DatasetEntryInput"("hash");

-- CreateIndex
CREATE UNIQUE INDEX "DatasetEntryOutput_hash_key" ON "DatasetEntryOutput"("hash");

-- CreateIndex
CREATE UNIQUE INDEX "CachedProcessedNodeData_nodeHash_incomingDEIHash_incomingDE_key" ON "CachedProcessedNodeData"("nodeHash", "incomingDEIHash", "incomingDEOHash");

-- CreateIndex
CREATE INDEX "LoggedCall_projectId_processingStatus_idx" ON "LoggedCall"("projectId", "processingStatus");

-- AddForeignKey
ALTER TABLE "DatasetFileUpload" ADD CONSTRAINT "DatasetFileUpload_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "Node"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dataset" ADD CONSTRAINT "Dataset_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "Node"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PruningRuleMatch" ADD CONSTRAINT "PruningRuleMatch_datasetEntryInputHash_fkey" FOREIGN KEY ("datasetEntryInputHash") REFERENCES "DatasetEntryInput"("hash") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonitorMatch" ADD CONSTRAINT "MonitorMatch_monitorId_fkey" FOREIGN KEY ("monitorId") REFERENCES "Node"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonitorMatch" ADD CONSTRAINT "MonitorMatch_loggedCallId_fkey" FOREIGN KEY ("loggedCallId") REFERENCES "LoggedCall"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Node" ADD CONSTRAINT "Node_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NodeOutput" ADD CONSTRAINT "NodeOutput_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "Node"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DataChannel" ADD CONSTRAINT "DataChannel_originId_fkey" FOREIGN KEY ("originId") REFERENCES "NodeOutput"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DataChannel" ADD CONSTRAINT "DataChannel_destinationId_fkey" FOREIGN KEY ("destinationId") REFERENCES "Node"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NodeData" ADD CONSTRAINT "NodeData_loggedCallId_fkey" FOREIGN KEY ("loggedCallId") REFERENCES "LoggedCall"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NodeData" ADD CONSTRAINT "NodeData_inputHash_fkey" FOREIGN KEY ("inputHash") REFERENCES "DatasetEntryInput"("hash") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NodeData" ADD CONSTRAINT "NodeData_outputHash_fkey" FOREIGN KEY ("outputHash") REFERENCES "DatasetEntryOutput"("hash") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NodeData" ADD CONSTRAINT "NodeData_rejectedOutputHash_fkey" FOREIGN KEY ("rejectedOutputHash") REFERENCES "DatasetEntryOutput"("hash") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NodeData" ADD CONSTRAINT "NodeData_dataChannelId_fkey" FOREIGN KEY ("dataChannelId") REFERENCES "DataChannel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NodeData" ADD CONSTRAINT "NodeData_parentNodeDataId_fkey" FOREIGN KEY ("parentNodeDataId") REFERENCES "NodeData"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CachedProcessedNodeData" ADD CONSTRAINT "CachedProcessedNodeData_incomingDEIHash_fkey" FOREIGN KEY ("incomingDEIHash") REFERENCES "DatasetEntryInput"("hash") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CachedProcessedNodeData" ADD CONSTRAINT "CachedProcessedNodeData_incomingDEOHash_fkey" FOREIGN KEY ("incomingDEOHash") REFERENCES "DatasetEntryOutput"("hash") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CachedProcessedNodeData" ADD CONSTRAINT "CachedProcessedNodeData_outgoingDEIHash_fkey" FOREIGN KEY ("outgoingDEIHash") REFERENCES "DatasetEntryInput"("hash") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CachedProcessedNodeData" ADD CONSTRAINT "CachedProcessedNodeData_outgoingDEOHash_fkey" FOREIGN KEY ("outgoingDEOHash") REFERENCES "DatasetEntryOutput"("hash") ON DELETE CASCADE ON UPDATE CASCADE;
