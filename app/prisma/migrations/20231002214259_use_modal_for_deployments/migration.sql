-- Step 1: Update the `status` to 'PENDING' if it's in ['AWAITING_DEPLOYMENT','DEPLOYING','UPLOADING_DATASET']

UPDATE "FineTune"
SET "status" = 'PENDING'
WHERE "status" IN ('AWAITING_DEPLOYMENT', 'DEPLOYING', 'UPLOADING_DATASET');

-- Step 2: Perform schema migration

-- AlterEnum
BEGIN;
CREATE TYPE "FineTuneStatus_new" AS ENUM ('PENDING', 'TRANSFERRING_TRAINING_DATA', 'TRAINING', 'DEPLOYED', 'ERROR');
ALTER TABLE "FineTune" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "FineTune" ALTER COLUMN "status" TYPE "FineTuneStatus_new" USING ("status"::text::"FineTuneStatus_new");
ALTER TYPE "FineTuneStatus" RENAME TO "FineTuneStatus_old";
ALTER TYPE "FineTuneStatus_new" RENAME TO "FineTuneStatus";
DROP TYPE "FineTuneStatus_old";
ALTER TABLE "FineTune" ALTER COLUMN "status" SET DEFAULT 'PENDING';
COMMIT;

-- AlterTable: Add new columns
ALTER TABLE "FineTune"
ADD COLUMN "huggingFaceModelId" TEXT,
ADD COLUMN "keepWarm" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "pipelineVersion" INTEGER,
ADD COLUMN "modalTrainingJobId" TEXT;

-- Step 3: Set the `pipelineVersion` to 0 for existing records

UPDATE "FineTune" SET "pipelineVersion" = 0;

-- Step 4: Set NOT NULL constraint on `pipelineVersion`

ALTER TABLE "FineTune" ALTER COLUMN "pipelineVersion" SET NOT NULL;
