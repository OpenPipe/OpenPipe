/*
  Warnings:

  - You are about to drop the `Evaluation` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Experiment` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ModelResponse` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `OutputEvaluation` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PromptVariant` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ScenarioVariantCell` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `TemplateVariable` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `TestScenario` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Evaluation" DROP CONSTRAINT "Evaluation_experimentId_fkey";

-- DropForeignKey
ALTER TABLE "Experiment" DROP CONSTRAINT "Experiment_projectId_fkey";

-- DropForeignKey
ALTER TABLE "ModelResponse" DROP CONSTRAINT "ModelResponse_scenarioVariantCellId_fkey";

-- DropForeignKey
ALTER TABLE "OutputEvaluation" DROP CONSTRAINT "OutputEvaluation_evaluationId_fkey";

-- DropForeignKey
ALTER TABLE "OutputEvaluation" DROP CONSTRAINT "OutputEvaluation_modelResponseId_fkey";

-- DropForeignKey
ALTER TABLE "PromptVariant" DROP CONSTRAINT "PromptVariant_experimentId_fkey";

-- DropForeignKey
ALTER TABLE "ScenarioVariantCell" DROP CONSTRAINT "ScenarioVariantCell_promptVariantId_fkey";

-- DropForeignKey
ALTER TABLE "ScenarioVariantCell" DROP CONSTRAINT "ScenarioVariantCell_testScenarioId_fkey";

-- DropForeignKey
ALTER TABLE "TemplateVariable" DROP CONSTRAINT "TemplateVariable_experimentId_fkey";

-- DropForeignKey
ALTER TABLE "TestScenario" DROP CONSTRAINT "TestScenario_experimentId_fkey";

-- DropTable
DROP TABLE "Evaluation";

-- DropTable
DROP TABLE "Experiment";

-- DropTable
DROP TABLE "ModelResponse";

-- DropTable
DROP TABLE "OutputEvaluation";

-- DropTable
DROP TABLE "PromptVariant";

-- DropTable
DROP TABLE "ScenarioVariantCell";

-- DropTable
DROP TABLE "TemplateVariable";

-- DropTable
DROP TABLE "TestScenario";

-- DropEnum
DROP TYPE "CellRetrievalStatus";

-- DropEnum
DROP TYPE "EvalType";
