-- CreateEnum
CREATE TYPE "NodeStatus" AS ENUM ('IDLE', 'PROCESSING');

-- DropIndex
DROP INDEX "LoggedCall_projectId_model_updatedAt_idx";

-- AlterTable
ALTER TABLE "Node" ADD COLUMN     "status" "NodeStatus" NOT NULL DEFAULT 'IDLE';

-- CreateIndex
CREATE INDEX "LoggedCall_projectId_model_updatedAt_id_idx" ON "LoggedCall"("projectId", "model", "updatedAt", "id");
