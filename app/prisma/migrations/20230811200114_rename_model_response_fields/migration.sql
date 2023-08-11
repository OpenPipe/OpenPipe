/*
  Warnings:

  - You are about to rename the column `completionTokens` to `outputTokens` on the `ModelResponse` table.
  - You are about to rename the column `promptTokens` to `inputTokens` on the `ModelResponse` table.
  - You are about to rename the column `startTime` on the `LoggedCall` table to `requestedAt`. Ensure compatibility with application logic.
  - You are about to rename the column `startTime` on the `LoggedCallModelResponse` table to `requestedAt`. Ensure compatibility with application logic.
  - You are about to rename the column `endTime` on the `LoggedCallModelResponse` table to `receivedAt`. Ensure compatibility with application logic.
  - You are about to rename the column `error` on the `LoggedCallModelResponse` table to `errorMessage`. Ensure compatibility with application logic.
  - You are about to rename the column `respStatus` on the `LoggedCallModelResponse` table to `statusCode`. Ensure compatibility with application logic.
  - You are about to rename the column `totalCost` on the `LoggedCallModelResponse` table to `cost`. Ensure compatibility with application logic.
  - You are about to rename the column `inputHash` on the `ModelResponse` table to `cacheKey`. Ensure compatibility with application logic.
  - You are about to rename the column `output` on the `ModelResponse` table to `respPayload`. Ensure compatibility with application logic.

*/
-- DropIndex
DROP INDEX "LoggedCall_startTime_idx";

-- DropIndex
DROP INDEX "ModelResponse_inputHash_idx";

-- Rename completionTokens to outputTokens
ALTER TABLE "ModelResponse"
RENAME COLUMN "completionTokens" TO "outputTokens";

-- Rename promptTokens to inputTokens
ALTER TABLE "ModelResponse"
RENAME COLUMN "promptTokens" TO "inputTokens";

-- AlterTable
ALTER TABLE "LoggedCall"
RENAME COLUMN "startTime" TO "requestedAt";

-- AlterTable
ALTER TABLE "LoggedCallModelResponse"
RENAME COLUMN "startTime" TO "requestedAt";

-- AlterTable
ALTER TABLE "LoggedCallModelResponse"
RENAME COLUMN "endTime" TO "receivedAt";

-- AlterTable
ALTER TABLE "LoggedCallModelResponse"
RENAME COLUMN "error" TO "errorMessage";

-- AlterTable
ALTER TABLE "LoggedCallModelResponse"
RENAME COLUMN "respStatus" TO "statusCode";

-- AlterTable
ALTER TABLE "LoggedCallModelResponse"
RENAME COLUMN "totalCost" TO "cost";

-- AlterTable
ALTER TABLE "ModelResponse"
RENAME COLUMN "inputHash" TO "cacheKey";

-- AlterTable
ALTER TABLE "ModelResponse"
RENAME COLUMN "output" TO "respPayload";

-- CreateIndex
CREATE INDEX "LoggedCall_requestedAt_idx" ON "LoggedCall"("requestedAt");

-- CreateIndex
CREATE INDEX "ModelResponse_cacheKey_idx" ON "ModelResponse"("cacheKey");
