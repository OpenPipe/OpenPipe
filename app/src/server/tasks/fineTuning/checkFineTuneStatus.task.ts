import { prisma } from "~/server/db";
import defineTask from "../defineTask";
import { startTestJobs } from "~/server/utils/startTestJobs";
import { trainerv1 } from "~/server/modal-rpc/clients";
import { captureFineTuneTrainingFinished } from "~/utils/analytics/serverAnalytics";

const runOnce = async () => {
  const trainingJobs = await prisma.fineTune.findMany({
    where: {
      status: {
        in: ["TRAINING"],
      },
      modalTrainingJobId: { not: null },
    },
  });

  await Promise.all(
    trainingJobs.map(async (job) => {
      if (!job.modalTrainingJobId) {
        throw new Error("No modalTrainingJobId");
      }
      try {
        const resp = await trainerv1.default.trainingStatus(job.modalTrainingJobId);
        if (resp.status === "done") {
          const fineTune = await prisma.fineTune.findUnique({
            where: { id: job.id },
          });
          if (!fineTune) return;
          if (fineTune.huggingFaceModelId) {
            // this kicks off the upload of the model weights and returns almost immediately.
            // We currently don't check whether the weights actually uploaded, probably should
            // add that at some point!
            await trainerv1.default.persistModelWeights(fineTune.huggingFaceModelId);
          }

          await prisma.fineTune.update({
            where: { id: job.id },
            data: {
              trainingFinishedAt: new Date(),
              status: "DEPLOYED",
            },
          });

          captureFineTuneTrainingFinished(fineTune.projectId, job.slug, true);

          await startTestJobs(job);
        } else if (resp.status === "error") {
          const fineTune = await prisma.fineTune.update({
            where: { id: job.id },
            data: {
              trainingFinishedAt: new Date(),
              status: "ERROR",
              errorMessage: "Training job failed",
            },
          });
          captureFineTuneTrainingFinished(fineTune.projectId, job.slug, false);
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
