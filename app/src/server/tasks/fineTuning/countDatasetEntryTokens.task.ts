import { prisma } from "~/server/db";
import { countLlamaInputTokens, countLlamaOutputTokens } from "~/utils/countTokens";
import defineTask from "../defineTask";
import { typedDatasetEntryInput, typedDatasetEntryOutput } from "~/types/dbColumns.types";

type CountDatasetEntryTokensJob = {
  projectId: string;
};

export const countDatasetEntryTokens = defineTask<CountDatasetEntryTokensJob>({
  id: "countDatasetEntryTokens",
  handler: async ({ projectId }) => {
    while (true) {
      const inputBatch = await prisma.datasetEntryInput.findMany({
        select: {
          hash: true,
          messages: true,
          tool_choice: true,
          tools: true,
          response_format: true,
        },
        orderBy: { createdAt: "desc" },
        where: { projectId, inputTokens: null },
        take: 1000,
      });
      const outputBatch = await prisma.datasetEntryOutput.findMany({
        select: {
          hash: true,
          output: true,
        },
        where: { projectId, outputTokens: null },
        take: 1000,
      });

      if (inputBatch.length === 0 && outputBatch.length === 0) break;

      await Promise.all(
        inputBatch.map(async (datasetEntryInput) => {
          let tInput;
          try {
            tInput = typedDatasetEntryInput(datasetEntryInput);
          } catch (e) {
            // If the entry is invalid, mark it as invalid and move on
            await prisma.datasetEntryInput.update({
              where: { hash: datasetEntryInput.hash },
              data: { inputTokens: 0 },
            });
            console.log(`Invalid dataset entry input ${datasetEntryInput.hash}`);
            return;
          }

          const inputTokens = countLlamaInputTokens(tInput);

          if (inputTokens === 0) {
            console.error(`Invalid token count on dataset entry input ${tInput.hash}`);
          }

          await prisma.datasetEntryInput.update({
            where: { hash: tInput.hash },
            data: { inputTokens },
          });
        }),
      );
      await Promise.all(
        outputBatch.map(async (datasetEntryOutput) => {
          let tOutput;
          try {
            tOutput = typedDatasetEntryOutput(datasetEntryOutput);
          } catch (e) {
            // If the entry is invalid, mark it as invalid and move on
            await prisma.datasetEntryOutput.update({
              where: { hash: datasetEntryOutput.hash },
              data: { outputTokens: 0 },
            });
            console.log(`Invalid dataset entry output ${datasetEntryOutput.hash}`);
            return;
          }

          const outputTokens = tOutput.output ? countLlamaOutputTokens(tOutput.output) : 0;

          if (outputTokens === 0) {
            console.error(`Invalid token count on dataset entry ${tOutput.hash}`);
          }

          await prisma.datasetEntryOutput.update({
            where: { hash: tOutput.hash },
            data: { outputTokens },
          });
        }),
      );
    }
  },
});

export const enqueueCountDatasetEntryTokens = async (job: CountDatasetEntryTokensJob) => {
  await countDatasetEntryTokens.enqueue(job, {
    queueName: `countDatasetEntryTokens-${job.projectId}`,
    jobKey: `countDatasetEntryTokens-${job.projectId}`,
  });
};
