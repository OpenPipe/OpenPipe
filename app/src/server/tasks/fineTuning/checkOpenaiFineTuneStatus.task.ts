import OpenAI from "openai";

import { prisma } from "~/server/db";
import defineTask from "../defineTask";
import { startTestJobs } from "~/server/utils/startTestJobs";
import { captureFineTuneTrainingFinished } from "~/utils/analytics/serverAnalytics";

const runOnce = async () => {
  const trainingOpenaiFineTunes = await prisma.fineTune.findMany({
    where: {
      status: {
        in: ["TRAINING"],
      },
      openaiTrainingJobId: {
        not: null,
      },
    },
    include: {
      project: {
        include: {
          apiKeys: true,
        },
      },
    },
  });

  await Promise.all(
    trainingOpenaiFineTunes.map(async (fineTune) => {
      if (!fineTune.openaiTrainingJobId) {
        throw new Error("No openaiTrainingJobId");
      }
      try {
        const openaiApiKey = fineTune.project.apiKeys.find((key) => key.provider === "OPENAI")
          ?.apiKey;

        if (!openaiApiKey) {
          await prisma.fineTune.update({
            where: { id: fineTune.id },
            data: {
              status: "ERROR",
              errorMessage: "No OpenAI API key found",
            },
          });
          return;
        }

        const openai = new OpenAI({ apiKey: openaiApiKey });

        const resp = await openai.fineTuning.jobs.retrieve(fineTune.openaiTrainingJobId);

        if (resp.status === "succeeded" && resp.fine_tuned_model) {
          await prisma.fineTune.update({
            where: { id: fineTune.id },
            data: {
              openaiModelId: resp.fine_tuned_model,
              status: "DEPLOYED",
            },
          });
          captureFineTuneTrainingFinished(fineTune.projectId, fineTune.slug, true);
          await startTestJobs(fineTune.datasetId, fineTune.id);
        } else if (resp.status === "failed") {
          await prisma.fineTune.update({
            where: { id: fineTune.id },
            data: {
              trainingFinishedAt: new Date(),
              status: "ERROR",
              errorMessage: "Failed to train model",
            },
          });
          captureFineTuneTrainingFinished(fineTune.projectId, fineTune.slug, false);
        }
      } catch (e) {
        console.error(`Failed to check training status for model ${fineTune.id}`, e);
        return;
      }
    }),
  );
};

export const checkOpenaiFineTuneStatus = defineTask({
  id: "checkOpenaiFineTuneStatus",
  handler: async () => {
    await runOnce();
  },
});
