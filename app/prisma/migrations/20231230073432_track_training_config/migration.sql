-- AlterTable
ALTER TABLE "FineTune" ADD COLUMN     "trainingConfig" JSONB,
ADD COLUMN     "trainingConfigOverrides" JSONB;
