-- CreateEnum
CREATE TYPE "NodeStatus" AS ENUM ('IDLE', 'PROCESSING');

-- AlterTable
ALTER TABLE "Node" ADD COLUMN     "status" "NodeStatus" NOT NULL DEFAULT 'IDLE';
