/*
  Warnings:

  - You are about to drop the column `migrated` on the `LoggedCall` table. All the data in the column will be lost.
  - You are about to drop the column `modelResponseId` on the `LoggedCall` table. All the data in the column will be lost.
  - You are about to drop the `LoggedCallModelResponse` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "LoggedCall" DROP CONSTRAINT "LoggedCall_modelResponseId_fkey";

-- DropForeignKey
ALTER TABLE "LoggedCallModelResponse" DROP CONSTRAINT "LoggedCallModelResponse_originalLoggedCallId_fkey";

-- DropIndex
DROP INDEX "LoggedCall_createdAt_migrated_idx";

-- AlterTable
ALTER TABLE "LoggedCall" DROP COLUMN "migrated",
DROP COLUMN "modelResponseId";

-- DropTable
DROP TABLE "LoggedCallModelResponse";
