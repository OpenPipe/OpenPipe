/*
  Warnings:

  - The values [PENDING] on the enum `InvoiceStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;

-- Step 1: Rename the old enum type
ALTER TYPE "InvoiceStatus" RENAME TO "InvoiceStatus_old";

-- Step 2: Create a new enum type with 'UNPAID' and 'PENDING'
CREATE TYPE "InvoiceStatus" AS ENUM ('UNPAID', 'PAID', 'CANCELLED', 'REFUNDED', 'FREE', 'PENDING');
ALTER TABLE "Invoice" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Invoice" ALTER COLUMN "status" TYPE "InvoiceStatus" USING ("status"::text::"InvoiceStatus");

-- Step 3: Update existing records from 'PENDING' to 'UNPAID'
UPDATE "Invoice" SET "status" = 'UNPAID' WHERE "status" = 'PENDING';

-- Step 4: Recreate the enum without 'PENDING' and update the column type
DROP TYPE "InvoiceStatus_old";
ALTER TYPE "InvoiceStatus" RENAME TO "InvoiceStatus_old";
CREATE TYPE "InvoiceStatus" AS ENUM ('UNPAID', 'PAID', 'CANCELLED', 'REFUNDED', 'FREE');
ALTER TABLE "Invoice" ALTER COLUMN "status" TYPE "InvoiceStatus" USING ("status"::text::"InvoiceStatus");
DROP TYPE "InvoiceStatus_old";
COMMIT;
-- Set the default value for the status column
ALTER TABLE "Invoice" ALTER COLUMN "status" SET DEFAULT 'UNPAID';

