/*
  Warnings:

  - The values [RequestLogsInput] on the enum `NodeType` will be removed. If these variants are still used in the database, this will fail.
  - The primary key for the `DatasetEntryInput` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `DatasetEntryInput` table. All the data in the column will be lost.
  - You are about to drop the column `datasetEntryInputId` on the `PruningRuleMatch` table. All the data in the column will be lost.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "NodeType_new" AS ENUM ('Monitor', 'StaticDataset', 'Filter', 'LLMFilter', 'LLMRelabel', 'ManualRelabel', 'Dataset');
ALTER TABLE "Node" ALTER COLUMN "type" TYPE "NodeType_new" USING ("type"::text::"NodeType_new");
ALTER TYPE "NodeType" RENAME TO "NodeType_old";
ALTER TYPE "NodeType_new" RENAME TO "NodeType";
DROP TYPE "NodeType_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "PruningRuleMatch" DROP CONSTRAINT "PruningRuleMatch_datasetEntryInputId_fkey";

-- AlterTable
ALTER TABLE "DatasetEntryInput" DROP CONSTRAINT "DatasetEntryInput_pkey",
DROP COLUMN "id";

-- AlterTable
ALTER TABLE "Node" ADD COLUMN     "maxOutputSize" INTEGER;

-- AlterTable
ALTER TABLE "PruningRuleMatch" DROP COLUMN "datasetEntryInputId",
ADD COLUMN     "datasetEntryInputHash" TEXT;

-- CreateTable
CREATE TABLE "MonitorMatch" (
    "id" UUID NOT NULL,
    "checkPassed" BOOLEAN NOT NULL,
    "monitorId" UUID NOT NULL,
    "loggedCallId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MonitorMatch_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "PruningRuleMatch" ADD CONSTRAINT "PruningRuleMatch_datasetEntryInputHash_fkey" FOREIGN KEY ("datasetEntryInputHash") REFERENCES "DatasetEntryInput"("hash") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonitorMatch" ADD CONSTRAINT "MonitorMatch_monitorId_fkey" FOREIGN KEY ("monitorId") REFERENCES "Node"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonitorMatch" ADD CONSTRAINT "MonitorMatch_loggedCallId_fkey" FOREIGN KEY ("loggedCallId") REFERENCES "LoggedCall"("id") ON DELETE SET NULL ON UPDATE CASCADE;
