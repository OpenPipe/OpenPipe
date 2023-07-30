-- AlterTable
ALTER TABLE "Experiment" ADD COLUMN     "dataFlowId" UUID;

-- AlterTable
ALTER TABLE "ModelResponse" ADD COLUMN     "loggedCallId" UUID,
ALTER COLUMN "scenarioVariantCellId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "LoggedCall" (
    "id" UUID NOT NULL,
    "promptFunctionHash" TEXT NOT NULL,
    "promptFunction" TEXT NOT NULL,
    "prompt" JSONB NOT NULL,
    "responsePayload" JSONB,
    "scenarioVariables" JSONB NOT NULL,
    "model" TEXT NOT NULL,
    "modelProvider" TEXT NOT NULL,
    "dataFlowId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LoggedCall_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DataFlow" (
    "id" UUID NOT NULL,
    "label" TEXT NOT NULL,
    "organizationId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DataFlow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApiKey" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "organizationId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApiKey_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ApiKey_key_key" ON "ApiKey"("key");

-- AddForeignKey
ALTER TABLE "Experiment" ADD CONSTRAINT "Experiment_dataFlowId_fkey" FOREIGN KEY ("dataFlowId") REFERENCES "DataFlow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModelResponse" ADD CONSTRAINT "ModelResponse_loggedCallId_fkey" FOREIGN KEY ("loggedCallId") REFERENCES "LoggedCall"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoggedCall" ADD CONSTRAINT "LoggedCall_dataFlowId_fkey" FOREIGN KEY ("dataFlowId") REFERENCES "DataFlow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DataFlow" ADD CONSTRAINT "DataFlow_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
