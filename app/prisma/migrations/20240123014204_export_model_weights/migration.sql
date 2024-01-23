-- CreateEnum
CREATE TYPE "ExportWeightsStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETE', 'ERROR');

-- CreateTable
CREATE TABLE "ExportWeightsRequest" (
    "id" UUID NOT NULL,
    "s3Key" TEXT NOT NULL,
    "publicUrl" TEXT NOT NULL,
    "fineTuneId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "status" "ExportWeightsStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExportWeightsRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ExportWeightsRequest_publicUrl_key" ON "ExportWeightsRequest"("publicUrl");

-- AddForeignKey
ALTER TABLE "ExportWeightsRequest" ADD CONSTRAINT "ExportWeightsRequest_fineTuneId_fkey" FOREIGN KEY ("fineTuneId") REFERENCES "FineTune"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExportWeightsRequest" ADD CONSTRAINT "ExportWeightsRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
