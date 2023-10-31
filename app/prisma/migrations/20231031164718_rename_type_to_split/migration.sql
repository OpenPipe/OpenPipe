-- Create the new enum type
CREATE TYPE "DatasetEntrySplit" AS ENUM ('TRAIN', 'TEST');

-- Drop the old index
DROP INDEX "DatasetEntry_datasetId_outdated_type_idx";

-- Change the column type
ALTER TABLE "DatasetEntry" ALTER COLUMN "type" TYPE "DatasetEntrySplit" USING "type"::text::"DatasetEntrySplit";

-- Rename the column
ALTER TABLE "DatasetEntry" RENAME COLUMN "type" TO "split";

-- Drop the old enum type
DROP TYPE "DatasetEntryType";

-- Create the new index
CREATE INDEX "DatasetEntry_datasetId_outdated_split_idx" ON "DatasetEntry"("datasetId", "outdated", "split");
