-- CreateEnum
CREATE TYPE "NodeStatus" AS ENUM ('IDLE', 'PROCESSING');

-- DropIndex
DROP INDEX "LoggedCall_projectId_model_updatedAt_idx";

-- AlterTable
ALTER TABLE "Node" ADD COLUMN     "status" "NodeStatus" NOT NULL DEFAULT 'IDLE';

-- CreateIndex
CREATE INDEX "LoggedCall_projectId_model_id_updatedAt_idx" ON "LoggedCall"("projectId", "model", "id", "updatedAt");
