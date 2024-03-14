-- AlterTable
ALTER TABLE "DatasetEval" ADD COLUMN     "judge" TEXT;

-- CreateTable
CREATE TABLE "ExternalModel" (
    "id" UUID NOT NULL,
    "modelName" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "apiKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExternalModel_pkey" PRIMARY KEY ("id")
);
