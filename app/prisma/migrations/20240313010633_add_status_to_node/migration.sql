-- CreateEnum
CREATE TYPE "NodeStatus" AS ENUM ('IDLE', 'QUEUED', 'PROCESSING');

-- DropIndex
DROP INDEX "LoggedCall_projectId_model_updatedAt_idx";

-- AlterTable
ALTER TABLE "Node" ADD COLUMN     "status" "NodeStatus" NOT NULL DEFAULT 'IDLE';

-- CreateIndex
CREATE INDEX "LoggedCall_projectId_model_updatedAt_id_idx" ON "LoggedCall"("projectId", "model", "updatedAt", "id");

-- AlterTable
ALTER TABLE "NodeEntry" ALTER COLUMN "originalOutputHash" DROP NOT NULL;

-- DropIndex
DROP INDEX "LoggedCallTag_loggedCallId_idx";

-- CreateIndex
CREATE INDEX "LoggedCallTag_loggedCallId_name_value_idx" ON "LoggedCallTag"("loggedCallId", "name", "value");

BEGIN;
-- AlterEnum
ALTER TYPE "NodeEntryStatus" ADD VALUE 'QUEUED';
COMMIT;

-- AlterTable
ALTER TABLE "NodeEntry" ALTER COLUMN "status" SET DEFAULT 'QUEUED';