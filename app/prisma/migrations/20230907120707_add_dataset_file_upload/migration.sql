-- CreateEnum
CREATE TYPE "DatasetFileUploadStatus" AS ENUM ('PENDING', 'DOWNLOADING', 'PROCESSING', 'SAVING', 'COMPLETE', 'ERROR');

-- CreateTable
CREATE TABLE "DatasetFileUpload" (
    "id" UUID NOT NULL,
    "datasetId" UUID NOT NULL,
    "blobName" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "status" "DatasetFileUploadStatus" NOT NULL DEFAULT 'PENDING',
    "uploadedAt" TIMESTAMP(3) NOT NULL,
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DatasetFileUpload_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "DatasetFileUpload" ADD CONSTRAINT "DatasetFileUpload_datasetId_fkey" FOREIGN KEY ("datasetId") REFERENCES "Dataset"("id") ON DELETE CASCADE ON UPDATE CASCADE;
