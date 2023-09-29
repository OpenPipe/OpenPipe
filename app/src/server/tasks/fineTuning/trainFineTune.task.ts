import { $ } from "execa";
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
import { deployFineTuneTask, trainerDirectory } from "./deployFineTune.task";

export type TrainFineTuneJob = {
  fineTuneId: string;
};

export async function trainModel(fineTuneId: string): Promise<void> {
  const baseUrl = (env.LOCAL_HOST_PUBLIC_URL ?? env.NEXT_PUBLIC_HOST) + "/api/internal/v1";
  const apiKey = env.AUTHENTICATED_SYSTEM_KEY;

  await $({
    stdio: "inherit",
    cwd: trainerDirectory,
  })`poetry run modal run trainer/entrypoint.py --fine-tune-id=${fineTuneId} --api-key=${apiKey} --base-url=${baseUrl}`;
}

export const trainFineTune = defineTask<TrainFineTuneJob>("trainFineTune", async (task) => {
  const { fineTuneId } = task;
  const fineTune = await prisma.fineTune.findUnique({
    where: { id: fineTuneId },
    select: {
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
      status: "TRANSFERING_TRAINING_DATA",
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

  await trainModel(fineTuneId);

  await prisma.fineTune.update({
    where: { id: fineTuneId },
    data: {
      status: "AWAITING_DEPLOYMENT",
    },
  });

  await deployFineTuneTask.enqueue({ fineTuneId });
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
