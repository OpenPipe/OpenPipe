/*
  Warnings:

  - You are about to drop the column `input` on the `DatasetEntry` table. All the data in the column will be lost.
  - You are about to drop the column `output` on the `DatasetEntry` table. All the data in the column will be lost.
  - Added the required column `loggedCallId` to the `DatasetEntry` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "DatasetEntry" DROP COLUMN "input",
DROP COLUMN "output",
ADD COLUMN     "loggedCallId" UUID NOT NULL;

-- AddForeignKey
ALTER TABLE "DatasetEntry" ADD CONSTRAINT "DatasetEntry_loggedCallId_fkey" FOREIGN KEY ("loggedCallId") REFERENCES "LoggedCall"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "LoggedCallModelResponse" ALTER COLUMN "cost" SET DATA TYPE DOUBLE PRECISION;

-- CreateEnum
CREATE TYPE "FineTuneStatus" AS ENUM ('PENDING', 'TRAINING', 'AWAITING_DEPLOYMENT', 'DEPLOYING', 'DEPLOYED', 'ERROR');

-- CreateTable
CREATE TABLE "FineTune" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "baseModel" TEXT NOT NULL,
    "status" "FineTuneStatus" NOT NULL DEFAULT 'PENDING',
    "trainingStartedAt" TIMESTAMP(3),
    "trainingFinishedAt" TIMESTAMP(3),
    "deploymentStartedAt" TIMESTAMP(3),
    "deploymentFinishedAt" TIMESTAMP(3),
    "datasetId" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FineTune_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FineTune_slug_key" ON "FineTune"("slug");

-- AddForeignKey
ALTER TABLE "FineTune" ADD CONSTRAINT "FineTune_datasetId_fkey" FOREIGN KEY ("datasetId") REFERENCES "Dataset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FineTune" ADD CONSTRAINT "FineTune_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;