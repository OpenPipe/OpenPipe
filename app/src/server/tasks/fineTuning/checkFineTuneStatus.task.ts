import { kysely, prisma } from "~/server/db";
import defineTask from "../defineTask";
import { trainerv1 } from "~/server/modal-rpc/clients";
import { captureFineTuneTrainingFinished } from "~/utils/analytics/serverAnalytics";

// import dayjs duration
import dayjs from "dayjs";
import { typedFineTune } from "~/types/dbColumns.types";
import { sql } from "kysely";
import { calculateCost } from "~/server/fineTuningProviders/supportedModels";
import {
  calculateNumEpochs,
  getNumEpochsFromConfig,
} from "~/server/fineTuningProviders/openpipe/trainingConfig";
import { trainFineTune } from "./trainFineTune.task";
import { startTestJobsForModel } from "~/server/utils/nodes/startTestJobs";
import { captureException } from "@sentry/node";
import { sendFineTuneModelTrained } from "~/server/emails/sendFineTuneModelTrained";

const MAX_AUTO_RETRIES = 2;

export const checkFineTuneStatus = defineTask({
  id: "checkFineTuneStatus",
  handler: async () => {
    const trainingFineTunes = await prisma.fineTune
      .findMany({
        where: {
          status: { in: ["TRAINING"] },
          provider: "openpipe",
        },
      })
      .then((fts) => fts.map(typedFineTune));

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
            const typedFT = typedFineTune(currentFineTune);

            const trainingStats = await kysely
              .selectFrom("FineTuneTrainingEntry as ftte")
              .where("ftte.fineTuneId", "=", typedFT.id)
              .select(() => [
                sql<number>`count(ftte.id)::int`.as("numTrainingEntries"),
                sql<number>`sum(ftte."prunedInputTokens")::int`.as("totalInputTokens"),
                sql<number>`sum(ftte."outputTokens")::int`.as("totalOutputTokens"),
              ])
              .executeTakeFirst();

            const numTrainingEntries = trainingStats?.numTrainingEntries ?? 0;
            const numEpochs =
              getNumEpochsFromConfig(typedFT) || calculateNumEpochs(numTrainingEntries);

            const totalInputTokens = (trainingStats?.totalInputTokens ?? 0) * numEpochs;
            const totalOutputTokens = (trainingStats?.totalOutputTokens ?? 0) * numEpochs;

            await prisma.usageLog.create({
              data: {
                type: "TRAINING",
                fineTuneId: typedFT.id,
                projectId: typedFT.projectId,
                baseModel: typedFT.baseModel,
                inputTokens: totalInputTokens,
                outputTokens: totalOutputTokens,
                ...calculateCost(typedFT, totalInputTokens + totalOutputTokens, 0, 0),
              },
            });

            await prisma.fineTune.update({
              where: { id: typedFT.id },
              data: {
                trainingFinishedAt: new Date(),
                status: "DEPLOYED",
                numEpochs,
              },
            });

            captureFineTuneTrainingFinished(typedFT.projectId, typedFT.slug, true);
            await startTestJobsForModel({
              modelId: currentFineTune.id,
              datasetId: currentFineTune.datasetId,
            });
            await sendFineTuneModelTrained(typedFT);
          } else if (resp.status === "error") {
            if (ft.numTrainingAutoretries < MAX_AUTO_RETRIES) {
              // Sometimes training jobs fail for no reason, so we'll retry them a few times
              await prisma.fineTune.update({
                where: { id: ft.id },
                data: {
                  numTrainingAutoretries: ft.numTrainingAutoretries + 1,
                },
              });
              await trainFineTune.enqueue({ fineTuneId: ft.id });
            } else {
              captureException("Training job failed.", {
                extra: {
                  fineTuneId: ft.id,
                  resp,
                },
              });

              await prisma.fineTune.update({
                where: { id: ft.id },
                data: {
                  trainingFinishedAt: new Date(),
                  status: "ERROR",
                  errorMessage: "Training job failed",
                },
              });
            }
            // Even if we're automatically retrying, it's useful to know that the job failed once
            captureFineTuneTrainingFinished(ft.projectId, ft.slug, false);
          }

          // If it's more than 24 hours old and hasn't finished or errored, mark it as errored
          else if (dayjs().diff(dayjs(ft.createdAt), "hour") > 24) {
            await prisma.fineTune.update({
              where: { id: ft.id },
              data: {
                trainingFinishedAt: new Date(),
                status: "ERROR",
                errorMessage: "Training job timed out",
              },
            });
            captureFineTuneTrainingFinished(ft.projectId, ft.slug, false);
          }
        } catch (e) {
          captureException(e, {
            extra: {
              test: `Failed to check training status for model ${ft.id}`,
              fineTuneId: ft.id,
            },
          });
          return;
        }
      }),
    );
  },
});
