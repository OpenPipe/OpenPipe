-- DropForeignKey
ALTER TABLE "CreditAdjustment" DROP CONSTRAINT "CreditAdjustment_invoiceId_fkey";

-- CreateIndex
CREATE INDEX "UsageLog_invoiceId_idx" ON "UsageLog"("invoiceId");

-- AddForeignKey
ALTER TABLE "CreditAdjustment" ADD CONSTRAINT "CreditAdjustment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
