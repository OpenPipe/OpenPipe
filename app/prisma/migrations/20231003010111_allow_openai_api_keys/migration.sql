-- CreateEnum
CREATE TYPE "ApiKeyProvider" AS ENUM ('OPENPIPE', 'OPENAI');

-- AlterTable
ALTER TABLE "ApiKey" ADD COLUMN     "provider" "ApiKeyProvider" NOT NULL DEFAULT 'OPENPIPE';
