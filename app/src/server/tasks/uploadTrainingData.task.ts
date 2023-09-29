import { prisma } from "~/server/db";
import defineTask from "./defineTask";
import { uploadTrainingDataFile } from "~/utils/azure/server";
import { type TrainingRow } from "~/components/datasets/validateTrainingRows";
import {
  FUNCTION_ARGS_TAG,
  FUNCTION_CALL_TAG,
  pruneInputMessages,
} from "~/modelProviders/fine-tuned/getCompletion";

export type UploadTrainingDataJob = {
  fineTuneId: string;
};

export const uploadTrainingData = defineTask<UploadTrainingDataJob>(
  "uploadTrainingData",
  async (task) => {
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

    const trainingEntries: TrainingRow[] = fineTune.trainingEntries.map((entry) => ({
      input: entry.datasetEntry.input,
      output: entry.datasetEntry.output,
    })) as unknown as TrainingRow[];

    const stringsToPrune = fineTune.pruningRules.map((rule) => rule.textToMatch);
    const formattedRows = trainingEntries.map((entry) => formatTrainingRow(entry, stringsToPrune));

    const jsonlStr = formattedRows.map((row) => JSON.stringify(row)).join("\n");

    const blobName = await uploadTrainingDataFile(jsonlStr);

    await prisma.fineTune.update({
      where: { id: fineTuneId },
      data: {
        trainingBlobName: blobName,
        status: "PENDING",
      },
    });
  },
);

export const queueUploadTrainingData = async (fineTuneId: string) => {
  await Promise.all([
    prisma.fineTune.update({
      where: {
        id: fineTuneId,
      },
      data: {
        errorMessage: null,
        status: "UPLOADING_DATASET",
      },
    }),

    uploadTrainingData.enqueue({ fineTuneId }),
  ]);
};

const formatTrainingRow = (row: TrainingRow, stringsToPrune: string[]) => {
  const instructions = pruneInputMessages(row.input, stringsToPrune);
  let output: string;
  if (row.output?.function_call) {
    output = FUNCTION_CALL_TAG + row.output.function_call.name;
    if (row.output.function_call.arguments) {
      output += FUNCTION_ARGS_TAG + row.output.function_call.arguments;
    }
  } else {
    output = row.output?.content ?? "";
  }
  return { instructions, output };
};
