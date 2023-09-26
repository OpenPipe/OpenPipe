/*
  Warnings:

  - The required column `persistentId` was added to the `DatasetEntry` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.
  - Added the required column `sortKey` to the `DatasetEntry` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "DatasetEntry_datasetId_createdAt_id_idx";

-- DropIndex
DROP INDEX "DatasetEntry_datasetId_type_idx";

-- AlterTable
ALTER TABLE "DatasetEntry" ADD COLUMN     "authoringUserId" UUID,
ADD COLUMN     "outdated" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "sortKey" TEXT,
ADD COLUMN     "persistentId" UUID;

UPDATE "DatasetEntry" SET "persistentId" = UUID_GENERATE_V4();
ALTER TABLE "DatasetEntry" ALTER COLUMN "persistentId" SET NOT NULL;

UPDATE "DatasetEntry"
SET "sortKey" = CONCAT(EXTRACT(EPOCH FROM "createdAt")::BIGINT, '-', "persistentId")
WHERE "sortKey" IS NULL;

ALTER TABLE "DatasetEntry" 
ALTER COLUMN "sortKey" SET NOT NULL;

-- AlterTable
ALTER TABLE "PruningRule" ADD COLUMN     "fineTuneId" UUID,
ALTER COLUMN "datasetId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "FineTuneTrainingEntry" (
    "id" UUID NOT NULL,
    "datasetEntryId" UUID NOT NULL,
    "fineTuneId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FineTuneTrainingEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FineTuneTrainingEntry_fineTuneId_createdAt_id_idx" ON "FineTuneTrainingEntry"("fineTuneId", "createdAt", "id");

-- CreateIndex
CREATE INDEX "DatasetEntry_datasetId_outdated_sortKey_idx" ON "DatasetEntry"("datasetId", "outdated", "sortKey");

-- CreateIndex
CREATE INDEX "DatasetEntry_datasetId_outdated_type_idx" ON "DatasetEntry"("datasetId", "outdated", "type");

-- AddForeignKey
ALTER TABLE "FineTuneTrainingEntry" ADD CONSTRAINT "FineTuneTrainingEntry_datasetEntryId_fkey" FOREIGN KEY ("datasetEntryId") REFERENCES "DatasetEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FineTuneTrainingEntry" ADD CONSTRAINT "FineTuneTrainingEntry_fineTuneId_fkey" FOREIGN KEY ("fineTuneId") REFERENCES "FineTune"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DatasetEntry" ADD CONSTRAINT "DatasetEntry_authoringUserId_fkey" FOREIGN KEY ("authoringUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PruningRule" ADD CONSTRAINT "PruningRule_fineTuneId_fkey" FOREIGN KEY ("fineTuneId") REFERENCES "FineTune"("id") ON DELETE CASCADE ON UPDATE CASCADE;
