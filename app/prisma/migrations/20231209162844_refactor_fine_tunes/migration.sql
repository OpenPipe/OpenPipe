CREATE TYPE "FineTuneProvider" AS ENUM ('openpipe', 'openai');

-- Change baseModel column type to TEXT temporarily
ALTER TABLE "FineTune" 
ALTER COLUMN "baseModel" TYPE TEXT;

-- Add temporary provider column
ALTER TABLE "FineTune" 
ADD COLUMN "tempProvider" "FineTuneProvider";

-- Populate the baseModel with new values and set provider based on the new baseModel value
UPDATE "FineTune"
SET "baseModel" = CASE 
    WHEN "baseModel" = 'GPT_3_5_TURBO' THEN 'gpt-3.5-turbo-1106'
    WHEN "baseModel" = 'MISTRAL_7b' THEN 'mistralai/Mistral-7B-v0.1'
    WHEN "baseModel" = 'LLAMA2_13b' THEN 'meta-llama/Llama-2-13b-hf'
    WHEN "baseModel" = 'LLAMA2_7b' THEN 'meta-llama/Llama-2-7b-hf'
    ELSE "baseModel"
END,
"tempProvider" = CASE 
    WHEN "baseModel" = 'GPT_3_5_TURBO' THEN 'openai'::"FineTuneProvider"
    ELSE 'openpipe'::"FineTuneProvider"
END;

-- Drop the keepWarm column
ALTER TABLE "FineTune"
DROP COLUMN "keepWarm";

-- for any openai row where the openaiModelId contains "3.5-turbo-0613", set the baseModel to "gpt-3.5-turbo-0613"
UPDATE "FineTune"
    SET "baseModel" = 'gpt-3.5-turbo-0613'
    WHERE "tempProvider" = 'openai'::"FineTuneProvider" AND "openaiModelId" LIKE '%3.5-turbo-0613%';

-- Drop the old inferenceUrls column
ALTER TABLE "FineTune"
DROP COLUMN "inferenceUrls";

-- Rename the temporary provider column
ALTER TABLE "FineTune"
RENAME COLUMN "tempProvider" TO "provider";

-- Set NOT NULL constraints
ALTER TABLE "FineTune"
ALTER COLUMN "baseModel" SET NOT NULL,
ALTER COLUMN "provider" SET NOT NULL;

-- Drop the old enum type
DROP TYPE "BaseModel";
