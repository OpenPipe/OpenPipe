/*
  Warnings:

  - You are about to drop the column `model` on the `PromptVariant` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "ModelOutput" ADD COLUMN     "cost" DOUBLE PRECISION;
