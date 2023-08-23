-- CreateEnum
CREATE TYPE "FineTuneStatus" AS ENUM ('PENDING', 'TRAINING', 'AWAITING_DEPLOYMENT', 'DEPLOYING', 'DEPLOYED', 'ERROR');

-- CreateTable
CREATE TABLE "FineTune" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "baseModel" TEXT NOT NULL,
    "status" "FineTuneStatus" NOT NULL DEFAULT 'PENDING',
    "training_started_at" TIMESTAMP(3),
    "training_finished_at" TIMESTAMP(3),
    "deployment_started_at" TIMESTAMP(3),
    "deployment_finished_at" TIMESTAMP(3),
    "datasetId" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FineTune_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FineTune_slug_key" ON "FineTune"("slug");

-- AddForeignKey
ALTER TABLE "FineTune" ADD CONSTRAINT "FineTune_datasetId_fkey" FOREIGN KEY ("datasetId") REFERENCES "Dataset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FineTune" ADD CONSTRAINT "FineTune_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
