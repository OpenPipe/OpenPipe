-- AlterTable
ALTER TABLE "ApiKey" ADD COLUMN     "readOnly" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "isPublic" BOOLEAN NOT NULL DEFAULT false;
