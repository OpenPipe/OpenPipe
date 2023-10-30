/*
  Warnings:

  - Added the required column `importId` to the `DatasetEntry` table without a default value. This is not possible if the table is not empty.
  - Added the required column `provenance` to the `DatasetEntry` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "DatasetEntryProvenance" AS ENUM ('REQUEST_LOG', 'UPLOAD', 'RELABELED_BY_MODEL', 'RELABELED_BY_HUMAN');

-- CreateEnum
CREATE TYPE "RelabelRequestStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETE', 'ERROR');

-- Add new columns with default values
ALTER TABLE "DatasetEntry"
ADD COLUMN "importId" TEXT NOT NULL DEFAULT '',
ADD COLUMN "provenance" "DatasetEntryProvenance" NOT NULL DEFAULT 'UPLOAD';

-- Update existing rows to use the default values
UPDATE "DatasetEntry" SET "importId" = '' WHERE "importId" IS NULL;
UPDATE "DatasetEntry" SET "provenance" = 'UPLOAD' WHERE "provenance" IS NULL;

-- Alter the table again to remove the default values if not needed
ALTER TABLE "DatasetEntry"
ALTER COLUMN "importId" DROP DEFAULT,
ALTER COLUMN "provenance" DROP DEFAULT;

-- CreateTable
CREATE TABLE "RelabelRequest" (
    "id" UUID NOT NULL,
    "batchId" TEXT NOT NULL,
    "datasetEntryPersistentId" UUID NOT NULL,
    "status" "RelabelRequestStatus" NOT NULL DEFAULT 'PENDING',
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RelabelRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RelabelRequest_batchId_datasetEntryPersistentId_key" ON "RelabelRequest"("batchId", "datasetEntryPersistentId");

-- CreateIndex
CREATE INDEX "DatasetEntry_importId_idx" ON "DatasetEntry"("importId");
