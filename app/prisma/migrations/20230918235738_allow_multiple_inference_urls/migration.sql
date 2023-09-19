-- Step 1: Add the new column with a default value of an empty array
ALTER TABLE "FineTune" ADD COLUMN "inferenceUrls" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Step 2: Update the new column with data from the old column for rows where inferenceUrl is not NULL
UPDATE "FineTune" SET "inferenceUrls" = ARRAY["inferenceUrl"] WHERE "inferenceUrl" IS NOT NULL;

-- Step 3: Drop the old column
ALTER TABLE "FineTune" DROP COLUMN "inferenceUrl";