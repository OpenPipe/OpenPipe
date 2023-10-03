import { prisma } from "~/server/db";
import defineTask from "../defineTask";
import { trainingStatus } from "~/utils/modal";

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
          // TODO: kick off job to run test set evals here

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
