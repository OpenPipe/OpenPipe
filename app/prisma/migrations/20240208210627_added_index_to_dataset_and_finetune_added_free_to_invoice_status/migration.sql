-- AlterEnum
ALTER TYPE "InvoiceStatus" ADD VALUE 'FREE';

-- CreateIndex
CREATE INDEX "Dataset_projectId_idx" ON "Dataset"("projectId");

-- CreateIndex
CREATE INDEX "FineTune_projectId_idx" ON "FineTune"("projectId");

-- CreateIndex
CREATE INDEX "FineTune_datasetId_idx" ON "FineTune"("datasetId");
