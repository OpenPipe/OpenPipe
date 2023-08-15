-- DropIndex
DROP INDEX "LoggedCallTag_name_idx";
DROP INDEX "LoggedCallTag_name_value_idx";

-- AlterTable: Add projectId column without NOT NULL constraint for now
ALTER TABLE "LoggedCallTag" ADD COLUMN "projectId" UUID;

-- Set the default value
UPDATE "LoggedCallTag" lct
SET "projectId" = lc."projectId"
FROM "LoggedCall" lc
WHERE lct."loggedCallId" = lc.id;

-- Now set the NOT NULL constraint
ALTER TABLE "LoggedCallTag" ALTER COLUMN "projectId" SET NOT NULL;

-- CreateIndex
CREATE INDEX "LoggedCallTag_projectId_name_idx" ON "LoggedCallTag"("projectId", "name");
CREATE INDEX "LoggedCallTag_projectId_name_value_idx" ON "LoggedCallTag"("projectId", "name", "value");

-- CreateIndex
CREATE UNIQUE INDEX "LoggedCallTag_loggedCallId_name_key" ON "LoggedCallTag"("loggedCallId", "name");
