import { prisma } from "~/server/db";
import defineTask from "../defineTask";
import { uploadTrainingDataFile } from "~/utils/azure/server";
import { type TrainingRow } from "~/components/datasets/validateTrainingRows";
import {
  FUNCTION_ARGS_TAG,
  FUNCTION_CALL_TAG,
  getStringsToPrune,
  pruneInputMessagesStringified,
} from "~/modelProviders/fine-tuned/getCompletion";
import { env } from "~/env.mjs";
import { trainerv1 } from "~/server/modal-rpc/clients";
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
              input: true,
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

  const trainingEntries: TrainingRow[] = fineTune.trainingEntries.map((entry) => ({
    input: entry.datasetEntry.input,
    output: entry.datasetEntry.output,
  })) as unknown as TrainingRow[];

  const stringsToPrune = await getStringsToPrune(fineTune.id);
  const formattedRows = trainingEntries.map((entry) => formatTrainingRow(entry, stringsToPrune));

  const jsonlStr = formattedRows.map((row) => JSON.stringify(row)).join("\n");

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

  console.log("going to start training");
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

const formatTrainingRow = (row: TrainingRow, stringsToPrune: string[]) => {
  const instruction = pruneInputMessagesStringified(row.input, stringsToPrune);
  let output: string;
  if (row.output?.function_call) {
    output = FUNCTION_CALL_TAG + row.output.function_call.name;
    if (row.output.function_call.arguments) {
      output += FUNCTION_ARGS_TAG + row.output.function_call.arguments;
    }
  } else {
    output = row.output?.content ?? "";
  }
  return { instruction, output };
};
