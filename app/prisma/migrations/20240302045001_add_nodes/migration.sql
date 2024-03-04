-- CreateEnum
CREATE TYPE "NodeType" AS ENUM ('Monitor', 'Archive', 'Filter', 'LLMRelabel', 'ManualRelabel', 'Dataset');

-- CreateEnum
CREATE TYPE "NodeEntryStatus" AS ENUM ('PENDING', 'PROCESSING', 'ERROR', 'PROCESSED');

-- AlterTable
ALTER TABLE "Dataset" ADD COLUMN     "nodeId" UUID;

-- AlterTable
ALTER TABLE "DatasetFileUpload" ADD COLUMN     "nodeId" UUID,
ALTER COLUMN "datasetId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "migrationKey" TEXT;

-- CreateTable
CREATE TABLE "NewPruningRuleMatch" (
    "id" UUID NOT NULL,
    "pruningRuleId" UUID NOT NULL,
    "inputHash" TEXT NOT NULL,

    CONSTRAINT "NewPruningRuleMatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PruningRulesChecked" (
    "nodeHash" TEXT NOT NULL,
    "incomingInputHash" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "NewFineTuneTrainingEntry" (
    "id" UUID NOT NULL,
    "prunedInputTokens" INTEGER,
    "outputTokens" INTEGER,
    "nodeEntryPersistentId" TEXT NOT NULL,
    "inputHash" TEXT NOT NULL,
    "outputHash" TEXT NOT NULL,
    "fineTuneId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NewFineTuneTrainingEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NewFineTuneTestingEntry" (
    "id" UUID NOT NULL,
    "prunedInputTokens" INTEGER,
    "finishReason" TEXT,
    "errorMessage" TEXT,
    "modelId" TEXT NOT NULL,
    "fineTuneId" UUID,
    "inputHash" TEXT NOT NULL,
    "outputHash" TEXT,
    "projectId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NewFineTuneTestingEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DatasetEvalNodeEntry" (
    "id" UUID NOT NULL,
    "datasetEvalId" UUID NOT NULL,
    "nodeEntryPersistentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DatasetEvalNodeEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NewDatasetEvalResult" (
    "id" UUID NOT NULL,
    "score" DOUBLE PRECISION,
    "explanation" TEXT,
    "errorMessage" TEXT,
    "status" "DatasetEvalResultStatus" NOT NULL DEFAULT 'PENDING',
    "judge" TEXT,
    "nodeEntryInputHash" TEXT NOT NULL,
    "nodeEntryOutputHash" TEXT,
    "wasFirst" BOOLEAN,
    "comparisonResultId" UUID,
    "comparisonOutputSourceId" UUID,
    "datasetEvalNodeEntryId" UUID NOT NULL,
    "datasetEvalOutputSourceId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NewDatasetEvalResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Node" (
    "id" UUID NOT NULL,
    "type" "NodeType" NOT NULL,
    "name" TEXT NOT NULL,
    "config" JSONB NOT NULL,
    "hash" TEXT NOT NULL,
    "stale" BOOLEAN NOT NULL DEFAULT false,
    "projectId" UUID NOT NULL,
    "creatorId" UUID,
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
    "lastProcessedAt" TIMESTAMP(3) NOT NULL DEFAULT '1970-01-01 00:00:00 +00:00',
    "originId" UUID,
    "destinationId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DataChannel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NodeEntry" (
    "id" UUID NOT NULL,
    "persistentId" TEXT NOT NULL,
    "status" "NodeEntryStatus" NOT NULL DEFAULT 'PENDING',
    "error" TEXT,
    "split" "DatasetEntrySplit" NOT NULL,
    "loggedCallId" UUID,
    "inputHash" TEXT NOT NULL,
    "outputHash" TEXT NOT NULL,
    "originalOutputHash" TEXT NOT NULL,
    "nodeId" UUID NOT NULL,
    "dataChannelId" UUID NOT NULL,
    "parentNodeEntryId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NodeEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DatasetEntryInput" (
    "tool_choice" JSONB,
    "tools" JSONB NOT NULL DEFAULT '[]',
    "messages" JSONB NOT NULL DEFAULT '[]',
    "response_format" JSONB,
    "inputTokens" INTEGER,
    "hash" TEXT NOT NULL,
    "projectId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "DatasetEntryOutput" (
    "output" JSONB NOT NULL,
    "hash" TEXT NOT NULL,
    "outputTokens" INTEGER,
    "projectId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "CachedProcessedEntry" (
    "id" UUID NOT NULL,
    "nodeHash" TEXT,
    "nodeEntryPersistentId" TEXT,
    "nodeId" UUID,
    "projectId" UUID NOT NULL,
    "incomingInputHash" TEXT NOT NULL,
    "incomingOutputHash" TEXT,
    "outgoingInputHash" TEXT,
    "outgoingOutputHash" TEXT,
    "outgoingSplit" "DatasetEntrySplit",
    "filterOutcome" TEXT,
    "explanation" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CachedProcessedEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "NewPruningRuleMatch_pruningRuleId_idx" ON "NewPruningRuleMatch"("pruningRuleId");

-- CreateIndex
CREATE UNIQUE INDEX "NewPruningRuleMatch_inputHash_pruningRuleId_key" ON "NewPruningRuleMatch"("inputHash", "pruningRuleId");

-- CreateIndex
CREATE INDEX "PruningRulesChecked_incomingInputHash_nodeHash_idx" ON "PruningRulesChecked"("incomingInputHash", "nodeHash");

-- CreateIndex
CREATE UNIQUE INDEX "PruningRulesChecked_nodeHash_incomingInputHash_key" ON "PruningRulesChecked"("nodeHash", "incomingInputHash");

-- CreateIndex
CREATE INDEX "NewFineTuneTrainingEntry_fineTuneId_createdAt_id_idx" ON "NewFineTuneTrainingEntry"("fineTuneId", "createdAt", "id");

-- CreateIndex
CREATE UNIQUE INDEX "NewFineTuneTrainingEntry_nodeEntryPersistentId_fineTuneId_key" ON "NewFineTuneTrainingEntry"("nodeEntryPersistentId", "fineTuneId");

-- CreateIndex
CREATE INDEX "NewFineTuneTestingEntry_fineTuneId_idx" ON "NewFineTuneTestingEntry"("fineTuneId");

-- CreateIndex
CREATE INDEX "NewFineTuneTestingEntry_projectId_idx" ON "NewFineTuneTestingEntry"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "NewFineTuneTestingEntry_inputHash_modelId_key" ON "NewFineTuneTestingEntry"("inputHash", "modelId");

-- CreateIndex
CREATE INDEX "DatasetEvalNodeEntry_datasetEvalId_nodeEntryPersistentId_idx" ON "DatasetEvalNodeEntry"("datasetEvalId", "nodeEntryPersistentId");

-- CreateIndex
CREATE INDEX "DatasetEvalNodeEntry_nodeEntryPersistentId_datasetEvalId_idx" ON "DatasetEvalNodeEntry"("nodeEntryPersistentId", "datasetEvalId");

-- CreateIndex
CREATE UNIQUE INDEX "DatasetEvalNodeEntry_nodeEntryPersistentId_datasetEvalId_key" ON "DatasetEvalNodeEntry"("nodeEntryPersistentId", "datasetEvalId");

-- CreateIndex
CREATE INDEX "NewDatasetEvalResult_nodeEntryInputHash_nodeEntryOutputHash_idx" ON "NewDatasetEvalResult"("nodeEntryInputHash", "nodeEntryOutputHash", "datasetEvalOutputSourceId");

-- CreateIndex
CREATE INDEX "NewDatasetEvalResult_comparisonResultId_idx" ON "NewDatasetEvalResult"("comparisonResultId");

-- CreateIndex
CREATE UNIQUE INDEX "NewDatasetEvalResult_datasetEvalNodeEntryId_nodeEntryInputH_key" ON "NewDatasetEvalResult"("datasetEvalNodeEntryId", "nodeEntryInputHash", "datasetEvalOutputSourceId", "comparisonOutputSourceId");

-- CreateIndex
CREATE INDEX "Node_projectId_idx" ON "Node"("projectId");

-- CreateIndex
CREATE INDEX "NodeEntry_dataChannelId_idx" ON "NodeEntry"("dataChannelId");

-- CreateIndex
CREATE INDEX "NodeEntry_nodeId_inputHash_persistentId_idx" ON "NodeEntry"("nodeId", "inputHash", "persistentId");

-- CreateIndex
CREATE INDEX "NodeEntry_loggedCallId_dataChannelId_idx" ON "NodeEntry"("loggedCallId", "dataChannelId");

-- CreateIndex
CREATE INDEX "NodeEntry_nodeId_status_updatedAt_idx" ON "NodeEntry"("nodeId", "status", "updatedAt");

-- CreateIndex
CREATE INDEX "NodeEntry_persistentId_nodeId_idx" ON "NodeEntry"("persistentId", "nodeId");

-- CreateIndex
CREATE UNIQUE INDEX "NodeEntry_parentNodeEntryId_dataChannelId_key" ON "NodeEntry"("parentNodeEntryId", "dataChannelId");

-- CreateIndex
CREATE INDEX "DatasetEntryInput_projectId_idx" ON "DatasetEntryInput"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "DatasetEntryInput_hash_key" ON "DatasetEntryInput"("hash");

-- CreateIndex
CREATE INDEX "DatasetEntryOutput_projectId_idx" ON "DatasetEntryOutput"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "DatasetEntryOutput_hash_key" ON "DatasetEntryOutput"("hash");

-- CreateIndex
CREATE INDEX "CachedProcessedEntry_nodeHash_idx" ON "CachedProcessedEntry"("nodeHash");

-- CreateIndex
CREATE INDEX "CachedProcessedEntry_nodeId_idx" ON "CachedProcessedEntry"("nodeId");

-- CreateIndex
CREATE INDEX "CachedProcessedEntry_incomingInputHash_nodeHash_idx" ON "CachedProcessedEntry"("incomingInputHash", "nodeHash");

-- CreateIndex
CREATE INDEX "CachedProcessedEntry_incomingInputHash_nodeId_idx" ON "CachedProcessedEntry"("incomingInputHash", "nodeId");

-- CreateIndex
CREATE INDEX "CachedProcessedEntry_projectId_idx" ON "CachedProcessedEntry"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "CachedProcessedEntry_nodeEntryPersistentId_incomingInputHas_key" ON "CachedProcessedEntry"("nodeEntryPersistentId", "incomingInputHash", "nodeHash", "incomingOutputHash");

-- CreateIndex
CREATE INDEX "LoggedCall_projectId_updatedAt_idx" ON "LoggedCall"("projectId", "updatedAt");

-- AddForeignKey
ALTER TABLE "DatasetFileUpload" ADD CONSTRAINT "DatasetFileUpload_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "Node"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dataset" ADD CONSTRAINT "Dataset_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "Node"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NewPruningRuleMatch" ADD CONSTRAINT "NewPruningRuleMatch_pruningRuleId_fkey" FOREIGN KEY ("pruningRuleId") REFERENCES "PruningRule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NewFineTuneTrainingEntry" ADD CONSTRAINT "NewFineTuneTrainingEntry_fineTuneId_fkey" FOREIGN KEY ("fineTuneId") REFERENCES "FineTune"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NewFineTuneTestingEntry" ADD CONSTRAINT "NewFineTuneTestingEntry_fineTuneId_fkey" FOREIGN KEY ("fineTuneId") REFERENCES "FineTune"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NewFineTuneTestingEntry" ADD CONSTRAINT "NewFineTuneTestingEntry_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DatasetEvalNodeEntry" ADD CONSTRAINT "DatasetEvalNodeEntry_datasetEvalId_fkey" FOREIGN KEY ("datasetEvalId") REFERENCES "DatasetEval"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NewDatasetEvalResult" ADD CONSTRAINT "NewDatasetEvalResult_comparisonOutputSourceId_fkey" FOREIGN KEY ("comparisonOutputSourceId") REFERENCES "DatasetEvalOutputSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NewDatasetEvalResult" ADD CONSTRAINT "NewDatasetEvalResult_datasetEvalNodeEntryId_fkey" FOREIGN KEY ("datasetEvalNodeEntryId") REFERENCES "DatasetEvalNodeEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NewDatasetEvalResult" ADD CONSTRAINT "NewDatasetEvalResult_datasetEvalOutputSourceId_fkey" FOREIGN KEY ("datasetEvalOutputSourceId") REFERENCES "DatasetEvalOutputSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Node" ADD CONSTRAINT "Node_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Node" ADD CONSTRAINT "Node_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NodeOutput" ADD CONSTRAINT "NodeOutput_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "Node"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DataChannel" ADD CONSTRAINT "DataChannel_originId_fkey" FOREIGN KEY ("originId") REFERENCES "NodeOutput"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DataChannel" ADD CONSTRAINT "DataChannel_destinationId_fkey" FOREIGN KEY ("destinationId") REFERENCES "Node"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NodeEntry" ADD CONSTRAINT "NodeEntry_loggedCallId_fkey" FOREIGN KEY ("loggedCallId") REFERENCES "LoggedCall"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NodeEntry" ADD CONSTRAINT "NodeEntry_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "Node"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NodeEntry" ADD CONSTRAINT "NodeEntry_dataChannelId_fkey" FOREIGN KEY ("dataChannelId") REFERENCES "DataChannel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NodeEntry" ADD CONSTRAINT "NodeEntry_parentNodeEntryId_fkey" FOREIGN KEY ("parentNodeEntryId") REFERENCES "NodeEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DatasetEntryInput" ADD CONSTRAINT "DatasetEntryInput_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DatasetEntryOutput" ADD CONSTRAINT "DatasetEntryOutput_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CachedProcessedEntry" ADD CONSTRAINT "CachedProcessedEntry_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "Node"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CachedProcessedEntry" ADD CONSTRAINT "CachedProcessedEntry_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
