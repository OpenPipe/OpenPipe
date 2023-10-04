import OpenAI from "openai";

import { prisma } from "~/server/db";
import defineTask from "../defineTask";
import { startTestJobs } from "~/server/utils/startTestJobs";

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
        }
      } catch (e) {
        console.error(`Failed to check training status for model ${fineTune.id}`, e);
        return;
      }
    }),
  );
};

export const checkOpenaiFineTuneStatus = defineTask("checkOpenaiFineTuneStatus", async () => {
  await runOnce();
});
