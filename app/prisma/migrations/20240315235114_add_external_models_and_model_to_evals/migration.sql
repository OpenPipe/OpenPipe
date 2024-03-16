-- AlterTable
ALTER TABLE "DatasetEval" ADD COLUMN     "evaluationModelId" UUID;

-- Set default value for existing rows
UPDATE "DatasetEval" SET "evaluationModelId" = '11111111-1111-1111-1111-111111111111' WHERE "evaluationModelId" IS NULL;

-- Modify the column to be NOT NULL
ALTER TABLE "DatasetEval" ALTER COLUMN "evaluationModelId" SET NOT NULL;
-- CreateTable
CREATE TABLE "ExternalModel" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "apiKey" TEXT NOT NULL,
    "projectId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExternalModel_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ExternalModel" ADD CONSTRAINT "ExternalModel_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
