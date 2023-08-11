/*
  Warnings:

  - You are about to rename the column `completionTokens` to `outputTokens` on the `ModelResponse` table.
  - You are about to rename the column `promptTokens` to `inputTokens` on the `ModelResponse` table.

*/

-- Rename completionTokens to outputTokens
ALTER TABLE "ModelResponse"
RENAME COLUMN "completionTokens" TO "outputTokens";

-- Rename promptTokens to inputTokens
ALTER TABLE "ModelResponse"
RENAME COLUMN "promptTokens" TO "inputTokens";
