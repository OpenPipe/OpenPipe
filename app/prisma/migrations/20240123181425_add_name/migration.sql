/*
  Warnings:

  - Added the required column `name` to the `Node` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Node" ADD COLUMN     "name" TEXT NOT NULL;
