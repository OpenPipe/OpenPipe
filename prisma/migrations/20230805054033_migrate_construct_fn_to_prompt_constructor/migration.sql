/*
  Warnings:

  - You are about to drop the column `constructFn` on the `PromptVariant` table. All the data in the column will be lost.
  - You are about to drop the column `constructFnVersion` on the `PromptVariant` table. All the data in the column will be lost.
  - Added the required column `promptConstructor` to the `PromptVariant` table without a default value. This is not possible if the table is not empty.
  - Added the required column `promptConstructorVersion` to the `PromptVariant` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable

ALTER TABLE "PromptVariant" RENAME COLUMN "constructFn" TO "promptConstructor";
ALTER TABLE "PromptVariant" RENAME COLUMN "constructFnVersion" TO "promptConstructorVersion";
