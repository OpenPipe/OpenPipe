import OpenAI from "openai";

import { kysely, prisma } from "~/server/db";
import defineTask from "../defineTask";
import { captureFineTuneTrainingFinished } from "~/utils/analytics/serverAnalytics";
import { typedFineTune } from "~/types/dbColumns.types";
import { startTestJobsForModel } from "~/server/utils/nodes/processNodes/startTestJobs";

const runOnce = async () => {
  const trainingOpenaiFineTunes = await prisma.fineTune
    .findMany({
      where: {
        status: {
          in: ["TRAINING"],
        },
        provider: "openai",
      },
      include: {
        project: {
          include: {
            apiKeys: true,
          },
        },
      },
    })
    .then((fts) => fts.map(typedFineTune));

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

          const dataset = await prisma.dataset.findUnique({
            where: { id: fineTune.datasetId },
          });

          if (dataset?.nodeId) {
            await startTestJobsForModel({
              modelId: fineTune.id,
              nodeEntryBaseQuery: kysely
                .selectFrom("NodeEntry as ne")
                .where("ne.nodeId", "=", dataset.nodeId)
                .where("ne.status", "=", "PROCESSED"),
            });
          }
        } else if (resp.status === "failed") {
          await prisma.fineTune.update({
            where: { id: fineTune.id },
            data: {
              trainingFinishedAt: new Date(),
              status: "ERROR",
              errorMessage: resp.error?.message || "See OpenAI dashboard for more details",
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
