import { type DatasetFileUpload } from "@prisma/client";
import { prisma } from "~/server/db";
import defineTask from "./defineTask";
import { downloadBlobToString } from "~/utils/azure/server";
import {
  type TrainingRow,
  validateTrainingRows,
  parseJSONL,
} from "~/components/datasets/validateTrainingRows";
import { formatEntriesFromTrainingRows } from "~/server/utils/createEntriesFromTrainingRows";
import { updatePruningRuleMatches } from "../utils/updatePruningRuleMatches";

export type ImportDatasetEntriesJob = {
  datasetFileUploadId: string;
};

export const importDatasetEntries = defineTask<ImportDatasetEntriesJob>(
  "importDatasetEntries",
  async (task) => {
    const { datasetFileUploadId } = task;
    const datasetFileUpload = await prisma.datasetFileUpload.findUnique({
      where: { id: datasetFileUploadId },
    });
    if (!datasetFileUpload) {
      await prisma.datasetFileUpload.update({
        where: { id: datasetFileUploadId },
        data: {
          errorMessage: "Dataset File Upload not found",
          status: "ERROR",
        },
      });
      return;
    }
    await prisma.datasetFileUpload.update({
      where: { id: datasetFileUploadId },
      data: {
        status: "DOWNLOADING",
        progress: 5,
      },
    });

    const onBlobDownloadProgress = async (progress: number) => {
      await prisma.datasetFileUpload.update({
        where: { id: datasetFileUploadId },
        data: {
          progress: 5 + Math.floor((progress / datasetFileUpload.fileSize) * 25),
        },
      });
    };

    const jsonlStr = await downloadBlobToString(datasetFileUpload.blobName, onBlobDownloadProgress);

    let trainingRows: TrainingRow[] = [];
    let validationError: string | null = null;
    try {
      trainingRows = parseJSONL(jsonlStr) as TrainingRow[];
      validationError = validateTrainingRows(trainingRows);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      validationError = e.message;
    }

    if (validationError) {
      await prisma.datasetFileUpload.update({
        where: { id: datasetFileUploadId },
        data: {
          errorMessage: `Invalid JSONL: ${validationError}`,
          status: "ERROR",
        },
      });
      return;
    }

    await prisma.datasetFileUpload.update({
      where: { id: datasetFileUploadId },
      data: {
        status: "PROCESSING",
        progress: 30,
      },
    });

    const updatePromises: Promise<DatasetFileUpload>[] = [];

    const updateCallback = async (progress: number) => {
      await prisma.datasetFileUpload.update({
        where: { id: datasetFileUploadId },
        data: {
          progress: 30 + Math.floor((progress / trainingRows.length) * 69),
        },
      });
    };

    let datasetEntriesToCreate;
    try {
      datasetEntriesToCreate = await formatEntriesFromTrainingRows(
        datasetFileUpload.datasetId,
        trainingRows,
        updateCallback,
        500,
      );
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      await prisma.datasetFileUpload.update({
        where: { id: datasetFileUploadId },
        data: {
          errorMessage: `Error formatting rows: ${e.message as string}`,
          status: "ERROR",
          visible: true,
        },
      });
      return;
    }

    await Promise.all(updatePromises);

    await prisma.datasetFileUpload.update({
      where: { id: datasetFileUploadId },
      data: {
        status: "SAVING",
        progress: 99,
      },
    });

    await prisma.datasetEntry.createMany({
      data: datasetEntriesToCreate,
    });

    await updatePruningRuleMatches(
      datasetFileUpload.datasetId,
      new Date(0),
      datasetEntriesToCreate.map((entry) => entry.id),
    );

    await prisma.datasetFileUpload.update({
      where: { id: datasetFileUploadId },
      data: {
        status: "COMPLETE",
        progress: 100,
        visible: true,
      },
    });
  },
);

export const queueImportDatasetEntries = async (datasetFileUploadId: string) => {
  await Promise.all([
    prisma.datasetFileUpload.update({
      where: {
        id: datasetFileUploadId,
      },
      data: {
        errorMessage: null,
        status: "PENDING",
      },
    }),

    importDatasetEntries.enqueue({ datasetFileUploadId }),
  ]);
};
