/*
  Warnings:

  - You are about to drop the `EvaluationResult` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterEnum
ALTER TYPE "EvalType" ADD VALUE 'GPT4_EVAL';

-- DropForeignKey
ALTER TABLE "EvaluationResult" DROP CONSTRAINT "EvaluationResult_evaluationId_fkey";

-- DropForeignKey
ALTER TABLE "EvaluationResult" DROP CONSTRAINT "EvaluationResult_promptVariantId_fkey";

-- DropTable
DROP TABLE "EvaluationResult";

-- CreateTable
CREATE TABLE "OutputEvaluation" (
    "id" UUID NOT NULL,
    "result" DOUBLE PRECISION NOT NULL,
    "details" TEXT,
    "modelOutputId" UUID NOT NULL,
    "evaluationId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OutputEvaluation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OutputEvaluation_modelOutputId_evaluationId_key" ON "OutputEvaluation"("modelOutputId", "evaluationId");

-- AddForeignKey
ALTER TABLE "OutputEvaluation" ADD CONSTRAINT "OutputEvaluation_modelOutputId_fkey" FOREIGN KEY ("modelOutputId") REFERENCES "ModelOutput"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutputEvaluation" ADD CONSTRAINT "OutputEvaluation_evaluationId_fkey" FOREIGN KEY ("evaluationId") REFERENCES "Evaluation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
