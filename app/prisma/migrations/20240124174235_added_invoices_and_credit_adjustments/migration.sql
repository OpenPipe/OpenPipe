-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('PENDING', 'PAID', 'CANCELLED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "CreditAdjustmentType" AS ENUM ('BONUS', 'REFUND', 'INVOICE');

-- AlterTable
ALTER TABLE "UsageLog" ADD COLUMN     "baseModel" TEXT,
ADD COLUMN     "inputCost" DECIMAL(65,30) NOT NULL DEFAULT 0,
ADD COLUMN     "invoiceId" UUID,
ADD COLUMN     "outputCost" DECIMAL(65,30) NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "Invoice" (
    "id" UUID NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'PENDING',
    "slug" TEXT NOT NULL,
    "billingPeriod" TEXT,
    "paidAt" TIMESTAMP(3),
    "description" JSONB,
    "paymentId" TEXT,
    "projectId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreditAdjustment" (
    "id" UUID NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "description" TEXT,
    "projectId" UUID NOT NULL,
    "invoiceId" UUID,
    "type" "CreditAdjustmentType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CreditAdjustment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Invoice_projectId_createdAt_idx" ON "Invoice"("projectId", "createdAt");

-- AddForeignKey
ALTER TABLE "UsageLog" ADD CONSTRAINT "UsageLog_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditAdjustment" ADD CONSTRAINT "CreditAdjustment_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditAdjustment" ADD CONSTRAINT "CreditAdjustment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;
