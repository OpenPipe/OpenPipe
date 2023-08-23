/*
  Warnings:

  - You are about to drop the column `input` on the `DatasetEntry` table. All the data in the column will be lost.
  - You are about to drop the column `output` on the `DatasetEntry` table. All the data in the column will be lost.
  - Added the required column `loggedCallId` to the `DatasetEntry` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "DatasetEntry" DROP COLUMN "input",
DROP COLUMN "output",
ADD COLUMN     "loggedCallId" UUID NOT NULL;

-- AddForeignKey
ALTER TABLE "DatasetEntry" ADD CONSTRAINT "DatasetEntry_loggedCallId_fkey" FOREIGN KEY ("loggedCallId") REFERENCES "LoggedCall"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "LoggedCallModelResponse" ALTER COLUMN "cost" SET DATA TYPE DOUBLE PRECISION;