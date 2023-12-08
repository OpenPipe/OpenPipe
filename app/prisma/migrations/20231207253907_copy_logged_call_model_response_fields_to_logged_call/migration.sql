/*
  Warnings:

  - You are about to drop the column `cacheHit` on the `LoggedCall` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "LoggedCall" DROP COLUMN "cacheHit",
ADD COLUMN     "completionId" TEXT,
ADD COLUMN     "cost" DOUBLE PRECISION,
ADD COLUMN     "durationMs" INTEGER,
ADD COLUMN     "errorMessage" TEXT,
ADD COLUMN     "finishReason" TEXT,
ADD COLUMN     "inputTokens" INTEGER,
ADD COLUMN     "migrated" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "outputTokens" INTEGER,
ADD COLUMN     "receivedAt" TIMESTAMP(3),
ADD COLUMN     "reqPayload" JSONB,
ADD COLUMN     "respPayload" JSONB,
ADD COLUMN     "statusCode" INTEGER;

-- CreateIndex
CREATE INDEX "LoggedCall_createdAt_migrated_idx" ON "LoggedCall"("createdAt", "migrated");
