-- 1. Add a nullable constructFn column
ALTER TABLE "PromptVariant"
ADD COLUMN "constructFn" TEXT;

-- 2. Populate constructFn based on the config column
UPDATE "PromptVariant"
SET "constructFn" = 'prompt = ' || "config"::text;

-- 3. Remove the config column
ALTER TABLE "PromptVariant"
DROP COLUMN "config";

-- 4. Make constructFn not null
ALTER TABLE "PromptVariant"
ALTER COLUMN "constructFn" SET NOT NULL;
