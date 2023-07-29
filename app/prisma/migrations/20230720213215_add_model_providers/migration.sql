-- Add new columns allowing NULL values
ALTER TABLE "PromptVariant" 
ADD COLUMN "constructFnVersion" INTEGER, 
ADD COLUMN "modelProvider" TEXT;

-- Update existing records to have the default values
UPDATE "PromptVariant" 
SET "constructFnVersion" = 1, 
"modelProvider" = 'openai/ChatCompletion' 
WHERE "constructFnVersion" IS NULL OR "modelProvider" IS NULL;

-- Alter table to set NOT NULL constraint
ALTER TABLE "PromptVariant" 
ALTER COLUMN "constructFnVersion" SET NOT NULL, 
ALTER COLUMN "modelProvider" SET NOT NULL;

ALTER TABLE "ScenarioVariantCell" ADD COLUMN     "prompt" JSONB;
