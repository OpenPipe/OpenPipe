/*
  Warnings:

  - Added the required column `timeToComplete` to the `ModelOutput` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ModelOutput" ADD COLUMN     "timeToComplete" INTEGER NOT NULL;
