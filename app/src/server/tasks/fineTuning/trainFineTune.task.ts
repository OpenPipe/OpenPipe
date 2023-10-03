import { prisma } from "~/server/db";
import defineTask from "../defineTask";
import { uploadTrainingDataFile } from "~/utils/azure/server";
import { type TrainingRow } from "~/components/datasets/validateTrainingRows";
import {
  FUNCTION_ARGS_TAG,
  FUNCTION_CALL_TAG,
  formatInputMessages,
} from "~/modelProviders/fine-tuned/getCompletion";
import { env } from "~/env.mjs";
import { startTraining } from "~/utils/modal";

export type TrainFineTuneJob = {
  fineTuneId: string;
};

export const trainFineTune = defineTask<TrainFineTuneJob>("trainFineTune", async (task) => {
  const { fineTuneId } = task;
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
      pruningRules: {
        select: {
          textToMatch: true,
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

  const stringsToPrune = fineTune.pruningRules.map((rule) => rule.textToMatch);
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
    const resp = await startTraining({
      fine_tune_id: fineTuneId,
      base_url: callbackBaseUrl,
    });
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
  // const resp = await fetch(startTraining, {
  //   method: "POST",
  //   body: JSON.stringify({
  //     fine_tune_id: fineTune.id,
  //     base_url: callbackBaseUrl,
  //   }),
  //   headers: {
  //     "Content-Type": "application/json",
  //   },
  // });
});

const formatTrainingRow = (row: TrainingRow, stringsToPrune: string[]) => {
  const instruction = formatInputMessages(row.input, stringsToPrune);
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
