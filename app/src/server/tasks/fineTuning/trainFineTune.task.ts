import { env } from "~/env.mjs";
import { getStringsToPrune, pruneInputMessages } from "~/modelProviders/fine-tuned/getCompletion";
import {
  CURRENT_PIPELINE_VERSION,
  serializeChatInput,
  serializeChatOutput,
  validatedChatInput,
  validatedChatOutput,
} from "~/modelProviders/fine-tuned/utils";
import { prisma } from "~/server/db";
import { trainerv1 } from "~/server/modal-rpc/clients";
import { uploadTrainingDataFile } from "~/utils/azure/server";
import defineTask from "../defineTask";
import { trainOpenaiFineTune } from "./trainOpenaiFineTune";

export type TrainFineTuneJob = {
  fineTuneId: string;
};

export const trainFineTune = defineTask<TrainFineTuneJob>("trainFineTune", async (task) => {
  const fineTune = await prisma.fineTune.findUnique({
    where: { id: task.fineTuneId },
  });

  if (!fineTune) return;

  if (fineTune.baseModel === "GPT_3_5_TURBO") {
    await trainOpenaiFineTune(fineTune.id);
  } else {
    await trainModalFineTune(fineTune.id);
  }
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

  const trainingRows = fineTune.trainingEntries.map((entry) => {
    const inputs = validatedChatInput(entry.datasetEntry);
    return {
      instruction: serializeChatInput(
        {
          messages: pruneInputMessages(inputs.messages, stringsToPrune),
          function_call: inputs.function_call,
        },
        { pipelineVersion: CURRENT_PIPELINE_VERSION },
      ),
      output: serializeChatOutput(validatedChatOutput(entry.datasetEntry.output)),
    };
  });

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
