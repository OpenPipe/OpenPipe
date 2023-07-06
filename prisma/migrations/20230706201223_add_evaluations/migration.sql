-- CreateEnum
CREATE TYPE "EvaluationMatchType" AS ENUM ('CONTAINS', 'DOES_NOT_CONTAIN');

-- CreateTable
CREATE TABLE "Evaluation" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "matchString" TEXT NOT NULL,
    "matchType" "EvaluationMatchType" NOT NULL,
    "experimentId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Evaluation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvaluationResult" (
    "id" UUID NOT NULL,
    "passCount" INTEGER NOT NULL,
    "failCount" INTEGER NOT NULL,
    "evaluationId" UUID NOT NULL,
    "promptVariantId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EvaluationResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EvaluationResult_evaluationId_promptVariantId_key" ON "EvaluationResult"("evaluationId", "promptVariantId");

-- AddForeignKey
ALTER TABLE "Evaluation" ADD CONSTRAINT "Evaluation_experimentId_fkey" FOREIGN KEY ("experimentId") REFERENCES "Experiment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvaluationResult" ADD CONSTRAINT "EvaluationResult_evaluationId_fkey" FOREIGN KEY ("evaluationId") REFERENCES "Evaluation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvaluationResult" ADD CONSTRAINT "EvaluationResult_promptVariantId_fkey" FOREIGN KEY ("promptVariantId") REFERENCES "PromptVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
