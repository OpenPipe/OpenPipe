-- CreateEnum
CREATE TYPE "NodeType" AS ENUM ('RequestLogsInput', 'StaticDataset', 'Filter', 'LLMFilter', 'LLMRelabel', 'ManualRelabel', 'Dataset');

-- CreateEnum
CREATE TYPE "NodeDataStatus" AS ENUM ('PENDING', 'PROCESSING', 'ERROR', 'PROCESSED');

-- CreateEnum
CREATE TYPE "NewDatasetEntryProvenance" AS ENUM ('RequestLog', 'StaticDataset', 'ManualRelabel', 'LLMRelabel');

-- AlterTable
ALTER TABLE "PruningRuleMatch" ADD COLUMN     "newDatasetEntryId" UUID,
ALTER COLUMN "datasetEntryId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "Node" (
    "id" UUID NOT NULL,
    "type" "NodeType" NOT NULL,
    "config" JSONB,
    "hash" TEXT NOT NULL,
    "maxEntriesPerMinute" INTEGER,
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
    "datasetEntryId" UUID NOT NULL,
    "dataChannelId" UUID NOT NULL,
    "parentNodeDataId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "nodeDataId" UUID,

    CONSTRAINT "NodeData_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NewDatasetEntry" (
    "id" UUID NOT NULL,
    "function_call" JSONB,
    "functions" JSONB,
    "tool_choice" JSONB,
    "tools" JSONB,
    "messages" JSONB NOT NULL DEFAULT '[]',
    "response_format" JSONB,
    "output" JSONB,
    "inputTokens" INTEGER,
    "outputTokens" INTEGER,
    "split" "DatasetEntrySplit" NOT NULL,
    "outdated" BOOLEAN NOT NULL DEFAULT false,
    "sortKey" TEXT NOT NULL,
    "persistentId" UUID NOT NULL,
    "importId" TEXT NOT NULL,
    "provenance" "NewDatasetEntryProvenance" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NewDatasetEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "NewDatasetEntry_importId_idx" ON "NewDatasetEntry"("importId");

-- CreateIndex
CREATE INDEX "NewDatasetEntry_persistentId_createdAt_idx" ON "NewDatasetEntry"("persistentId", "createdAt");

-- AddForeignKey
ALTER TABLE "PruningRuleMatch" ADD CONSTRAINT "PruningRuleMatch_newDatasetEntryId_fkey" FOREIGN KEY ("newDatasetEntryId") REFERENCES "NewDatasetEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Node" ADD CONSTRAINT "Node_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NodeOutput" ADD CONSTRAINT "NodeOutput_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "Node"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DataChannel" ADD CONSTRAINT "DataChannel_originId_fkey" FOREIGN KEY ("originId") REFERENCES "NodeOutput"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DataChannel" ADD CONSTRAINT "DataChannel_destinationId_fkey" FOREIGN KEY ("destinationId") REFERENCES "Node"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NodeData" ADD CONSTRAINT "NodeData_datasetEntryId_fkey" FOREIGN KEY ("datasetEntryId") REFERENCES "NewDatasetEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NodeData" ADD CONSTRAINT "NodeData_dataChannelId_fkey" FOREIGN KEY ("dataChannelId") REFERENCES "DataChannel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NodeData" ADD CONSTRAINT "NodeData_parentNodeDataId_fkey" FOREIGN KEY ("parentNodeDataId") REFERENCES "NodeData"("id") ON DELETE CASCADE ON UPDATE CASCADE;
