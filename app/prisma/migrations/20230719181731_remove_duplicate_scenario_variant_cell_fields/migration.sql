/*
  Warnings:

  - You are about to drop the column `completionTokens` on the `ScenarioVariantCell` table. All the data in the column will be lost.
  - You are about to drop the column `inputHash` on the `ScenarioVariantCell` table. All the data in the column will be lost.
  - You are about to drop the column `output` on the `ScenarioVariantCell` table. All the data in the column will be lost.
  - You are about to drop the column `promptTokens` on the `ScenarioVariantCell` table. All the data in the column will be lost.
  - You are about to drop the column `timeToComplete` on the `ScenarioVariantCell` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "ScenarioVariantCell" DROP COLUMN "completionTokens",
DROP COLUMN "inputHash",
DROP COLUMN "output",
DROP COLUMN "promptTokens",
DROP COLUMN "timeToComplete";
