/*
  Warnings:

  - You are about to rename the column `matchString` on the `Evaluation` table. If there is any code or views referring to the old name, they will break.
  - You are about to rename the column `matchType` on the `Evaluation` table. If there is any code or views referring to the old name, they will break.
  - You are about to rename the column `name` on the `Evaluation` table. If there is any code or views referring to the old name, they will break.
  - You are about to rename the enum `EvaluationMatchType` to `EvalType`. If there is any code or views referring to the old name, they will break.
*/

-- RenameEnum
ALTER TYPE "EvaluationMatchType" RENAME TO "EvalType";

-- AlterTable
ALTER TABLE "Evaluation" RENAME COLUMN "matchString" TO "value";
ALTER TABLE "Evaluation" RENAME COLUMN "matchType" TO "evalType";
ALTER TABLE "Evaluation" RENAME COLUMN "name" TO "label";

-- AlterColumnType
ALTER TABLE "Evaluation" ALTER COLUMN "evalType" TYPE "EvalType" USING "evalType"::text::"EvalType";

-- SetNotNullConstraint
ALTER TABLE "Evaluation" ALTER COLUMN "evalType" SET NOT NULL;
ALTER TABLE "Evaluation" ALTER COLUMN "label" SET NOT NULL;
ALTER TABLE "Evaluation" ALTER COLUMN "value" SET NOT NULL;
