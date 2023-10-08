/*
  Warnings:

  - A unique constraint covering the columns `[projectId,apiKey]` on the table `ApiKey` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "ApiKey_apiKey_key";

-- CreateIndex
CREATE INDEX "ApiKey_apiKey_idx" ON "ApiKey"("apiKey");

-- CreateIndex
CREATE UNIQUE INDEX "ApiKey_projectId_apiKey_key" ON "ApiKey"("projectId", "apiKey");
