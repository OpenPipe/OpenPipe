/*
  Warnings:

  - You are about to alter the column `cost` on the `LoggedCallModelResponse` table. The data in that column could be lost. The data in that column will be cast from `Decimal(18,12)` to `DoublePrecision`.

*/
-- AlterTable
ALTER TABLE "LoggedCallModelResponse" ALTER COLUMN "cost" SET DATA TYPE DOUBLE PRECISION;
