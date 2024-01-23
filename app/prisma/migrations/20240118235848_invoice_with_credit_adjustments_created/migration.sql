/*
  Warnings:

  - You are about to drop the column `cost` on the `Invoice` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `Invoice` table. All the data in the column will be lost.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "InvoiceStatus" ADD VALUE 'CANCELED';
ALTER TYPE "InvoiceStatus" ADD VALUE 'REFUNDED';

-- DropIndex
DROP INDEX "Invoice_projectId_createdAt_type_idx";

-- AlterTable
ALTER TABLE "Invoice" DROP COLUMN "cost",
DROP COLUMN "type",
ADD COLUMN     "amount" DECIMAL(65,30),
ADD COLUMN     "paidAt" TIMESTAMP(3),
ADD COLUMN     "paymentId" TEXT,
ADD COLUMN     "remainingCredits" DECIMAL(65,30),
ADD COLUMN     "status" "InvoiceStatus" NOT NULL DEFAULT 'PENDING';

-- CreateTable
CREATE TABLE "CreditAdjustment" (
    "id" UUID NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "projectId" UUID NOT NULL,
    "description" TEXT,
    "invoiceId" UUID,

    CONSTRAINT "CreditAdjustment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Invoice_projectId_createdAt_idx" ON "Invoice"("projectId", "createdAt");

-- AddForeignKey
ALTER TABLE "CreditAdjustment" ADD CONSTRAINT "CreditAdjustment_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditAdjustment" ADD CONSTRAINT "CreditAdjustment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;
