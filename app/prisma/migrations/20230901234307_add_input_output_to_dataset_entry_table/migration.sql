/*
  Warnings:

  - Added the required column `input` to the `DatasetEntry` table without a default value. This is not possible if the table is not empty.
  - Added the required column `inputTokens` to the `DatasetEntry` table without a default value. This is not possible if the table is not empty.
  - Added the column `output` to the `DatasetEntry` table without a default value.
  - Added the required column `outputTokens` to the `DatasetEntry` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "DatasetEntry" ADD COLUMN     "input" JSONB NOT NULL,
ADD COLUMN     "inputTokens" INTEGER NOT NULL,
ADD COLUMN     "output" JSONB,
ADD COLUMN     "outputTokens" INTEGER NOT NULL;
