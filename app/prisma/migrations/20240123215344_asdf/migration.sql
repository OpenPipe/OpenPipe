/*
  Warnings:

  - A unique constraint covering the columns `[monitorId,loggedCallId]` on the table `MonitorMatch` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "LoggedCallProcessingStatus" AS ENUM ('PENDING', 'PROCESSING', 'PROCESSED');

-- CreateEnum
CREATE TYPE "MonitorMatchStatus" AS ENUM ('PENDING', 'IN_REVIEW', 'MATCH');

-- AlterTable
ALTER TABLE "LoggedCall" ADD COLUMN     "processingStatus" "LoggedCallProcessingStatus" NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "MonitorMatch" ADD COLUMN     "status" "MonitorMatchStatus" NOT NULL DEFAULT 'PENDING';

-- CreateIndex
CREATE UNIQUE INDEX "MonitorMatch_monitorId_loggedCallId_key" ON "MonitorMatch"("monitorId", "loggedCallId");
