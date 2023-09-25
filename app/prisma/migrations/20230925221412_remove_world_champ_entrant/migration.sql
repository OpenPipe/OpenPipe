/*
  Warnings:

  - You are about to drop the `WorldChampEntrant` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "WorldChampEntrant" DROP CONSTRAINT "WorldChampEntrant_userId_fkey";

-- DropTable
DROP TABLE "WorldChampEntrant";
