import { prisma } from "~/server/db";
import defineTask from "../defineTask";
import { startTestJobs } from "~/server/utils/startTestJobs";
import { trainerv1 } from "~/server/modal-rpc/clients";
import { captureFineTuneTrainingFinished } from "~/utils/analytics/serverAnalytics";

const runOnce = async () => {
  const trainingFineTunes = await prisma.fineTune.findMany({
    where: {
      status: {
        in: ["TRAINING"],
      },
      modalTrainingJobId: { not: null },
    },
  });

  await Promise.all(
    trainingFineTunes.map(async (ft) => {
      if (!ft.modalTrainingJobId) {
        throw new Error("No modalTrainingJobId");
      }
      try {
        const resp = await trainerv1.default.trainingStatus(ft.modalTrainingJobId);
        if (resp.status === "done") {
          // Ensure we have the latest fine-tune data
          const currentFineTune = await prisma.fineTune.findUnique({
            where: { id: ft.id },
          });
          if (!currentFineTune) return;
          if (currentFineTune.huggingFaceModelId) {
            // this kicks off the upload of the model weights and returns almost immediately.
            // We currently don't check whether the weights actually uploaded, probably should
            // add that at some point!
            await trainerv1.default.persistModelWeights(currentFineTune.huggingFaceModelId);
          }

          await prisma.fineTune.update({
            where: { id: currentFineTune.id },
            data: {
              trainingFinishedAt: new Date(),
              status: "DEPLOYED",
            },
          });

          captureFineTuneTrainingFinished(currentFineTune.projectId, currentFineTune.slug, true);

          await startTestJobs(currentFineTune.datasetId, currentFineTune.id);
        } else if (resp.status === "error") {
          await prisma.fineTune.update({
            where: { id: ft.id },
            data: {
              trainingFinishedAt: new Date(),
              status: "ERROR",
              errorMessage: "Training job failed",
            },
          });
          captureFineTuneTrainingFinished(ft.projectId, ft.slug, false);
        }
      } catch (e) {
        console.error(`Failed to check training status for model ${ft.id}`, e);
        return;
      }
    }),
  );
};

export const checkFineTuneStatus = defineTask({
  id: "checkFineTuneStatus",
  handler: async () => {
    await runOnce();
  },
});
