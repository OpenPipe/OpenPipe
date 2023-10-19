-- CreateEnum
CREATE TYPE "UsageType" AS ENUM ('TESTING', 'EXTERNAL');

-- CreateTable
CREATE TABLE "UsageLog" (
    "id" UUID NOT NULL,
    "inputTokens" INTEGER NOT NULL,
    "outputTokens" INTEGER NOT NULL,
    "cost" DOUBLE PRECISION NOT NULL,
    "type" "UsageType" NOT NULL DEFAULT 'EXTERNAL',
    "fineTuneId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UsageLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UsageLog_fineTuneId_createdAt_type_idx" ON "UsageLog"("fineTuneId", "createdAt", "type");

-- AddForeignKey
ALTER TABLE "UsageLog" ADD CONSTRAINT "UsageLog_fineTuneId_fkey" FOREIGN KEY ("fineTuneId") REFERENCES "FineTune"("id") ON DELETE CASCADE ON UPDATE CASCADE;
