-- AddForeignKey
ALTER TABLE "DatasetEvalResult" ADD CONSTRAINT "DatasetEvalResult_comparisonOutputSourceId_fkey" FOREIGN KEY ("comparisonOutputSourceId") REFERENCES "DatasetEvalOutputSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;
