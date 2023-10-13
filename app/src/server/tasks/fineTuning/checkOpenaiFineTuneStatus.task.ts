import OpenAI from "openai";

import { prisma } from "~/server/db";
import defineTask from "../defineTask";
import { startTestJobs } from "~/server/utils/startTestJobs";
import { env } from "~/env.mjs";
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
        const isOpenai = fineTune.baseModel === "GPT_3_5_TURBO";
        const openaiApiKey = !isOpenai
          ? env.ANYSCALE_API_KEY
          : fineTune.project.apiKeys.find((key) => key.provider === "OPENAI")?.apiKey;

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

        const openai = new OpenAI({
          apiKey: openaiApiKey,
          baseURL: isOpenai ? undefined : env.ANYSCALE_API_BASE,
        });

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
          await startTestJobs(fineTune);
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
