import { env } from "~/env.mjs";
import { getStringsToPrune, pruneInputMessages } from "~/modelProviders/fine-tuned/getCompletion";
import { prisma } from "~/server/db";
import { trainerv1 } from "~/server/modal-rpc/clients";
import { uploadTrainingDataFile } from "~/utils/azure/server";
import defineTask from "../defineTask";
import { trainOpenaiFineTune } from "./trainOpenaiFineTune";
import { CURRENT_PIPELINE_VERSION } from "~/types/shared.types";
import { serializeChatInput, serializeChatOutput } from "~/modelProviders/fine-tuned/serializers";
import { typedDatasetEntry } from "~/types/dbColumns.types";
import { truthyFilter } from "~/utils/utils";
import { countLlamaChatTokens } from "~/utils/countTokens";

export type TrainFineTuneJob = {
  fineTuneId: string;
};

export const trainFineTune = defineTask<TrainFineTuneJob>({
  id: "trainFineTune",
  handler: async (task) => {
    const fineTune = await prisma.fineTune.findUnique({
      where: { id: task.fineTuneId },
    });

    if (!fineTune) return;

    if (fineTune.baseModel === "GPT_3_5_TURBO") {
      await trainOpenaiFineTune(fineTune.id);
    } else {
      await trainModalFineTune(fineTune.id);
    }
  },
});

const trainModalFineTune = async (fineTuneId: string) => {
  const fineTune = await prisma.fineTune.findUnique({
    where: { id: fineTuneId },
    include: {
      trainingEntries: {
        select: {
          datasetEntry: {
            select: {
              messages: true,
              function_call: true,
              functions: true,
              output: true,
            },
          },
        },
      },
    },
  });
  if (!fineTune) return;

  await prisma.fineTune.update({
    where: { id: fineTuneId },
    data: {
      status: "TRANSFERRING_TRAINING_DATA",
    },
  });

  const stringsToPrune = await getStringsToPrune(fineTune.id);

  const trainingRows = fineTune.trainingEntries
    .map((entry) => {
      const dsEntry = typedDatasetEntry(entry.datasetEntry);
      if (!dsEntry.output) return null;
      return {
        instruction: serializeChatInput(
          {
            messages: pruneInputMessages(dsEntry.messages, stringsToPrune),
            function_call: dsEntry.function_call ?? undefined,
            functions: dsEntry.functions ?? undefined,
          },
          { pipelineVersion: CURRENT_PIPELINE_VERSION },
        ),
        output: serializeChatOutput(dsEntry.output),
      };
    })
    .filter(truthyFilter);

  const jsonlStr = trainingRows.map((row) => JSON.stringify(row)).join("\n");

  const blobName = await uploadTrainingDataFile(jsonlStr);

  const huggingFaceModelId = `OpenPipe/ft-${env.NODE_ENV}-${fineTuneId}`;

  await prisma.fineTune.update({
    where: { id: fineTuneId },
    data: {
      status: "TRAINING",
      trainingBlobName: blobName,
      trainingStartedAt: new Date(),
      huggingFaceModelId,
    },
  });

  // When we kick off a training job the trainer needs to be able to report its
  // progress somewhere, and since the trainer will be running remotely on Modal
  // the callback URL needs to be a publicly available host.
  const callbackBaseUrl = (env.LOCAL_HOST_PUBLIC_URL ?? env.NEXT_PUBLIC_HOST) + "/api/internal/v1";

  try {
    const resp = await trainerv1.default.startTraining(fineTuneId, callbackBaseUrl);
    await prisma.fineTune.update({
      where: { id: fineTuneId },
      data: {
        status: "TRAINING",
        trainingStartedAt: new Date(),
        modalTrainingJobId: resp.call_id,
      },
    });
  } catch (e) {
    console.error("Failed to start training", e);
    await prisma.fineTune.update({
      where: { id: fineTuneId },
      data: {
        status: "ERROR",
      },
    });
  }
};
