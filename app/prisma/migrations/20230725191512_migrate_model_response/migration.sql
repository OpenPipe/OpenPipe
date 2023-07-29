-- DropForeignKey
ALTER TABLE "ModelOutput" DROP CONSTRAINT "ModelOutput_scenarioVariantCellId_fkey";

-- DropForeignKey
ALTER TABLE "OutputEvaluation" DROP CONSTRAINT "OutputEvaluation_modelOutputId_fkey";

-- DropIndex
DROP INDEX "OutputEvaluation_modelOutputId_evaluationId_key";

-- AlterTable
ALTER TABLE "OutputEvaluation" RENAME COLUMN "modelOutputId" TO "modelResponseId";

-- AlterTable
ALTER TABLE "ScenarioVariantCell" DROP COLUMN "retryTime",
DROP COLUMN "statusCode",
ADD COLUMN     "jobQueuedAt" TIMESTAMP(3),
ADD COLUMN     "jobStartedAt" TIMESTAMP(3);

ALTER TABLE "ModelOutput" RENAME TO "ModelResponse";

ALTER TABLE "ModelResponse" 
ADD COLUMN "requestedAt" TIMESTAMP(3),
ADD COLUMN "receivedAt" TIMESTAMP(3),
ADD COLUMN "statusCode" INTEGER,
ADD COLUMN "errorMessage" TEXT,
ADD COLUMN "retryTime" TIMESTAMP(3),
ADD COLUMN "outdated" BOOLEAN NOT NULL DEFAULT false;

-- 3. Remove the unnecessary column
ALTER TABLE "ModelResponse"
DROP COLUMN "timeToComplete";

-- AlterTable
ALTER TABLE "ModelResponse" RENAME CONSTRAINT "ModelOutput_pkey" TO "ModelResponse_pkey";
ALTER TABLE "ModelResponse" ALTER COLUMN "output" DROP NOT NULL;

-- DropIndex
DROP INDEX "ModelOutput_scenarioVariantCellId_key";

-- AddForeignKey
ALTER TABLE "ModelResponse" ADD CONSTRAINT "ModelResponse_scenarioVariantCellId_fkey" FOREIGN KEY ("scenarioVariantCellId") REFERENCES "ScenarioVariantCell"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "ModelOutput_inputHash_idx" RENAME TO "ModelResponse_inputHash_idx";

-- CreateIndex
CREATE UNIQUE INDEX "OutputEvaluation_modelResponseId_evaluationId_key" ON "OutputEvaluation"("modelResponseId", "evaluationId");

-- AddForeignKey
ALTER TABLE "OutputEvaluation" ADD CONSTRAINT "OutputEvaluation_modelResponseId_fkey" FOREIGN KEY ("modelResponseId") REFERENCES "ModelResponse"("id") ON DELETE CASCADE ON UPDATE CASCADE;


