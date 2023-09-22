-- AlterEnum
ALTER TYPE "FineTuneStatus" ADD VALUE 'UPLOADING_DATASET';

-- AlterTable
ALTER TABLE "FineTune" ADD COLUMN     "errorMessage" TEXT;

-- AlterTable
ALTER TABLE "FineTune" ADD COLUMN     "trainingBlobName" TEXT;
