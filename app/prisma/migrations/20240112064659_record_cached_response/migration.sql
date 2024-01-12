-- AlterEnum
ALTER TYPE "UsageType" ADD VALUE 'CACHE_HIT';

-- AlterTable
ALTER TABLE "LoggedCall" ADD COLUMN     "cacheHit" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "CachedResponse" (
    "id" UUID NOT NULL,
    "cacheKey" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "completionId" TEXT NOT NULL,
    "respPayload" JSONB NOT NULL,
    "inputTokens" INTEGER NOT NULL,
    "outputTokens" INTEGER NOT NULL,
    "projectId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CachedResponse_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CachedResponse_completionId_idx" ON "CachedResponse"("completionId");

-- CreateIndex
CREATE UNIQUE INDEX "CachedResponse_projectId_cacheKey_key" ON "CachedResponse"("projectId", "cacheKey");

-- AddForeignKey
ALTER TABLE "CachedResponse" ADD CONSTRAINT "CachedResponse_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
