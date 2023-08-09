-- CreateTable
CREATE TABLE "LoggedCall" (
    "id" UUID NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "cacheHit" BOOLEAN NOT NULL,
    "modelResponseId" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LoggedCall_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoggedCallModelResponse" (
    "id" UUID NOT NULL,
    "reqPayload" JSONB NOT NULL,
    "respStatus" INTEGER,
    "respPayload" JSONB,
    "error" TEXT,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "cacheKey" TEXT,
    "durationMs" INTEGER,
    "inputTokens" INTEGER,
    "outputTokens" INTEGER,
    "finishReason" TEXT,
    "completionId" TEXT,
    "totalCost" DECIMAL(18,12),
    "originalLoggedCallId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LoggedCallModelResponse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoggedCallTag" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "value" TEXT,
    "loggedCallId" UUID NOT NULL,

    CONSTRAINT "LoggedCallTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApiKey" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "apiKey" TEXT NOT NULL,
    "organizationId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApiKey_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LoggedCall_startTime_idx" ON "LoggedCall"("startTime");

-- CreateIndex
CREATE UNIQUE INDEX "LoggedCallModelResponse_originalLoggedCallId_key" ON "LoggedCallModelResponse"("originalLoggedCallId");

-- CreateIndex
CREATE INDEX "LoggedCallModelResponse_cacheKey_idx" ON "LoggedCallModelResponse"("cacheKey");

-- CreateIndex
CREATE INDEX "LoggedCallTag_name_idx" ON "LoggedCallTag"("name");

-- CreateIndex
CREATE INDEX "LoggedCallTag_name_value_idx" ON "LoggedCallTag"("name", "value");

-- CreateIndex
CREATE UNIQUE INDEX "ApiKey_apiKey_key" ON "ApiKey"("apiKey");

-- AddForeignKey
ALTER TABLE "LoggedCall" ADD CONSTRAINT "LoggedCall_modelResponseId_fkey" FOREIGN KEY ("modelResponseId") REFERENCES "LoggedCallModelResponse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoggedCall" ADD CONSTRAINT "LoggedCall_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoggedCallModelResponse" ADD CONSTRAINT "LoggedCallModelResponse_originalLoggedCallId_fkey" FOREIGN KEY ("originalLoggedCallId") REFERENCES "LoggedCall"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoggedCallTag" ADD CONSTRAINT "LoggedCallTag_loggedCallId_fkey" FOREIGN KEY ("loggedCallId") REFERENCES "LoggedCall"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
