/*
  Warnings:

  - The values [UPLOADING_DATASET] on the enum `FineTuneStatus` will be removed. If these variants are still used in the database, this will fail.
  - Added the required column `pipelineVersion` to the `FineTune` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "FineTuneStatus_new" AS ENUM ('PENDING', 'TRANSFERING_TRAINING_DATA', 'TRAINING', 'AWAITING_DEPLOYMENT', 'DEPLOYING', 'DEPLOYED', 'ERROR');
ALTER TABLE "FineTune" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "FineTune" ALTER COLUMN "status" TYPE "FineTuneStatus_new" USING ("status"::text::"FineTuneStatus_new");
ALTER TYPE "FineTuneStatus" RENAME TO "FineTuneStatus_old";
ALTER TYPE "FineTuneStatus_new" RENAME TO "FineTuneStatus";
DROP TYPE "FineTuneStatus_old";
ALTER TABLE "FineTune" ALTER COLUMN "status" SET DEFAULT 'PENDING';
COMMIT;

-- AlterTable
ALTER TABLE "FineTune" ADD COLUMN     "huggingFaceModelId" TEXT,
ADD COLUMN     "modalDeployId" TEXT,
ADD COLUMN     "modalRequestsPerInstance" INTEGER NOT NULL DEFAULT 40,
ADD COLUMN     "modalMinGpus" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "FineTune" ADD COLUMN "pipelineVersion" INTEGER;
UPDATE "FineTune" SET "pipelineVersion" = 1 WHERE "pipelineVersion" IS NULL;
ALTER TABLE "FineTune" ALTER COLUMN "pipelineVersion" SET NOT NULL;
