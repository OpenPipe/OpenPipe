/*
  Warnings:

  - The values [LLAMA2_70b] on the enum `BaseModel` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "BaseModel_new" AS ENUM ('MISTRAL_7b', 'LLAMA2_7b', 'LLAMA2_13b', 'GPT_3_5_TURBO');
ALTER TABLE "FineTune" ALTER COLUMN "baseModel" DROP DEFAULT;
ALTER TABLE "FineTune" ALTER COLUMN "baseModel" TYPE "BaseModel_new" USING ("baseModel"::text::"BaseModel_new");
ALTER TYPE "BaseModel" RENAME TO "BaseModel_old";
ALTER TYPE "BaseModel_new" RENAME TO "BaseModel";
DROP TYPE "BaseModel_old";
COMMIT;

-- AlterTable
ALTER TABLE "FineTune" ALTER COLUMN "baseModel" DROP DEFAULT;
