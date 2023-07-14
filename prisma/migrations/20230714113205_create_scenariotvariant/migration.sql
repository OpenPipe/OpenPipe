-- Drop the foreign key constraints on the original ModelOutput
ALTER TABLE "ModelOutput" DROP CONSTRAINT "ModelOutput_promptVariantId_fkey";
ALTER TABLE "ModelOutput" DROP CONSTRAINT "ModelOutput_testScenarioId_fkey";

-- Rename the old table
ALTER TABLE "ModelOutput" RENAME TO "ScenarioVariantCell";
ALTER TABLE "ScenarioVariantCell" RENAME CONSTRAINT "ModelOutput_pkey" TO "ScenarioVariantCell_pkey";
ALTER INDEX "ModelOutput_inputHash_idx" RENAME TO "ScenarioVariantCell_inputHash_idx";
ALTER INDEX "ModelOutput_promptVariantId_testScenarioId_key" RENAME TO "ScenarioVariantCell_promptVariantId_testScenarioId_key";

-- Add the new fields to the renamed table
ALTER TABLE "ScenarioVariantCell" ADD COLUMN "retryTime" TIMESTAMP(3);
ALTER TABLE "ScenarioVariantCell" ADD COLUMN "streamingChannel" TEXT;
ALTER TABLE "ScenarioVariantCell" ALTER COLUMN "inputHash" DROP NOT NULL;
ALTER TABLE "ScenarioVariantCell" ALTER COLUMN "output" DROP NOT NULL,
ALTER COLUMN "statusCode" DROP NOT NULL,
ALTER COLUMN "timeToComplete" DROP NOT NULL;

-- Create the new table
CREATE TABLE "ModelOutput" (
    "id" UUID NOT NULL,
    "inputHash" TEXT NOT NULL,
    "output" JSONB NOT NULL,
    "timeToComplete" INTEGER NOT NULL DEFAULT 0,
    "promptTokens" INTEGER,
    "completionTokens" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "scenarioVariantCellId" UUID
);

-- Move inputHash index
DROP INDEX "ScenarioVariantCell_inputHash_idx";
CREATE INDEX "ModelOutput_inputHash_idx" ON "ModelOutput"("inputHash");

CREATE UNIQUE INDEX "ModelOutput_scenarioVariantCellId_key" ON "ModelOutput"("scenarioVariantCellId");
ALTER TABLE "ModelOutput" ADD CONSTRAINT "ModelOutput_scenarioVariantCellId_fkey" FOREIGN KEY ("scenarioVariantCellId") REFERENCES "ScenarioVariantCell"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ModelOutput" ALTER COLUMN "scenarioVariantCellId" SET NOT NULL,
ADD CONSTRAINT "ModelOutput_pkey" PRIMARY KEY ("id");

ALTER TABLE "ScenarioVariantCell" ADD CONSTRAINT "ScenarioVariantCell_promptVariantId_fkey" FOREIGN KEY ("promptVariantId") REFERENCES "PromptVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ScenarioVariantCell" ADD CONSTRAINT "ScenarioVariantCell_testScenarioId_fkey" FOREIGN KEY ("testScenarioId") REFERENCES "TestScenario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateEnum
CREATE TYPE "CellRetrievalStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETE', 'ERROR');

-- AlterTable
ALTER TABLE "ScenarioVariantCell" ADD COLUMN     "retrievalStatus" "CellRetrievalStatus" NOT NULL DEFAULT 'COMPLETE';
