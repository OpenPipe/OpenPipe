-- AlterTable
ALTER TABLE "DatasetEntryInput" ADD CONSTRAINT "DatasetEntryInput_pkey" PRIMARY KEY ("hash");

-- AlterTable
ALTER TABLE "DatasetEntryOutput" ADD CONSTRAINT "DatasetEntryOutput_pkey" PRIMARY KEY ("hash");
