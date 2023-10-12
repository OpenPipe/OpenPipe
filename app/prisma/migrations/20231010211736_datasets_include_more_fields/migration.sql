ALTER TABLE "DatasetEntry" 
RENAME COLUMN "input" TO "messages";

ALTER TABLE "DatasetEntry"
ADD COLUMN "function_call" JSONB,
ADD COLUMN "functions" JSONB;
