/*
  Warnings:

  - Added the required column `slug` to the `Invoice` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "billingPeriod" TEXT,
ADD COLUMN     "slug" TEXT NOT NULL;
