-- CreateEnum
CREATE TYPE "DatasetEvalType" AS ENUM ('FIELD_COMPARISON', 'HEAD_TO_HEAD');

-- AlterTable
ALTER TABLE "DatasetEval" ADD COLUMN     "type" "DatasetEvalType" NOT NULL DEFAULT 'HEAD_TO_HEAD';

-- AlterTable
ALTER TABLE "DatasetEvalResult" ALTER COLUMN "comparisonResultId" DROP NOT NULL,
ALTER COLUMN "comparisonOutputSourceId" DROP NOT NULL;
