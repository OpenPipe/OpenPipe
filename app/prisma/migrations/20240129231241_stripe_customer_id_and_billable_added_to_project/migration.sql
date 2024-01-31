-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "billable" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "stripeCustomerId" TEXT;