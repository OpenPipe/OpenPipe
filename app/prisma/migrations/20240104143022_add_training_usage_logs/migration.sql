-- AlterEnum
ALTER TYPE "UsageType" ADD VALUE 'TRAINING';

-- AlterTable
ALTER TABLE "FineTuneTrainingEntry" ADD COLUMN     "prunedInputTokens" INTEGER;
