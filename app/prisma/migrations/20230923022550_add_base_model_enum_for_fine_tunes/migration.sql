-- CreateEnum
CREATE TYPE "BaseModel" AS ENUM ('LLAMA2_7b', 'LLAMA2_13b', 'LLAMA2_70b', 'GPT_3_5_TURBO');

-- Rename the previous column
ALTER TABLE "FineTune" RENAME COLUMN "baseModel" TO "prevBaseModel";

-- Add the new column
ALTER TABLE "FineTune" ADD COLUMN "baseModel" "BaseModel" NOT NULL DEFAULT 'LLAMA2_7b';

-- Copy the data from the old column to the new column
UPDATE "FineTune" SET "baseModel" = "prevBaseModel"::text::"BaseModel";

-- Remove the old column
ALTER TABLE "FineTune" DROP COLUMN "prevBaseModel";
