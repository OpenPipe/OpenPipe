-- AlterTable
ALTER TABLE "FineTune" ADD COLUMN     "userId" UUID;

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "rateLimit" INTEGER NOT NULL DEFAULT 3;

-- Update existing projects to have a rateLimit of 1000
UPDATE "Project" SET "rateLimit" = 1000;

-- CreateTable
CREATE TABLE "OngoingRequest" (
    "id" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OngoingRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OngoingRequest_projectId_createdAt_idx" ON "OngoingRequest"("projectId", "createdAt");

-- AddForeignKey
ALTER TABLE "FineTune" ADD CONSTRAINT "FineTune_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
