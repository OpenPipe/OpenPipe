import { type ChatCompletionMessage } from "openai/resources/chat";

import { prisma } from "~/server/db";
import defineTask from "../defineTask";
import { trainingStatus } from "~/utils/modal";
import { getStringsToPrune, pruneInputMessages } from "~/modelProviders/fine-tuned/getCompletion";
import { countLlamaChatTokens } from "~/utils/countTokens";
import { queueGetTestResult } from "../getTestResult.task";

const runOnce = async () => {
  const trainingJobs = await prisma.fineTune.findMany({
    where: {
      status: {
        in: ["TRAINING"],
      },
      modalTrainingJobId: {
        not: null,
      },
    },
  });

  await Promise.all(
    trainingJobs.map(async (job) => {
      if (!job.modalTrainingJobId) {
        throw new Error("No modalTrainingJobId");
      }
      try {
        const resp = await trainingStatus({ callId: job.modalTrainingJobId });
        if (resp.status === "done") {
          const fineTune = await prisma.fineTune.findUnique({
            where: { id: job.id },
          });
          if (!fineTune) return;
          const stringsToPrune = await getStringsToPrune(fineTune.id);
          const datasetEntries = await prisma.datasetEntry.findMany({
            where: { datasetId: fineTune.datasetId, outdated: false, type: "TEST" },
            select: { id: true, input: true },
            orderBy: { sortKey: "desc" },
          });
          // create fineTuneTestEntry for each dataset entry
          await prisma.fineTuneTestingEntry.createMany({
            data: datasetEntries.map((entry) => {
              const prunedInput = pruneInputMessages(
                entry.input as unknown as ChatCompletionMessage[],
                stringsToPrune,
              );
              const prunedInputTokens = countLlamaChatTokens(prunedInput);
              return {
                fineTuneId: fineTune.id,
                datasetEntryId: entry.id,
                prunedInputTokens,
                prunedInput,
              };
            }),
            skipDuplicates: true,
          });
          for (const entry of datasetEntries) {
            await queueGetTestResult(fineTune.id, entry.id);
          }

          await prisma.fineTune.update({
            where: { id: job.id },
            data: {
              trainingFinishedAt: new Date(),
              status: "DEPLOYED",
            },
          });
        } else if (resp.status === "error") {
          await prisma.fineTune.update({
            where: { id: job.id },
            data: {
              trainingFinishedAt: new Date(),
              status: "ERROR",
            },
          });
        }
      } catch (e) {
        console.error(`Failed to check training status for model ${job.id}`, e);
        return;
      }
    }),
  );
};

export const checkFineTuneStatus = defineTask("checkFineTuneStatus", async () => {
  await runOnce();
});
