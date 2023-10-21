import { parseRowsToImport } from "~/components/datasets/parseRowsToImport";
import { prisma } from "~/server/db";
import { downloadBlobToString } from "~/utils/azure/server";
import { prepareDatasetEntriesForImport } from "../utils/prepareDatasetEntriesForImport";
import { updatePruningRuleMatches } from "../utils/updatePruningRuleMatches";
import defineTask from "./defineTask";
import { startDatasetTestJobs } from "../utils/startTestJobs";
import { countDatasetEntryTokens } from "./fineTuning/countDatasetEntryTokens.task";

export type ImportDatasetEntriesJob = {
  datasetFileUploadId: string;
};

export const importDatasetEntries = defineTask<ImportDatasetEntriesJob>({
  id: "importDatasetEntries",
  handler: async (task) => {
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

    const rowsToImport = parseRowsToImport(jsonlStr);

    if ("error" in rowsToImport) {
      await prisma.datasetFileUpload.update({
        where: { id: datasetFileUploadId },
        data: {
          errorMessage: `Invalid JSONL: ${rowsToImport.error}`,
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

    const updateCallback = async (progress: number) => {
      await prisma.datasetFileUpload.update({
        where: { id: datasetFileUploadId },
        data: {
          progress: 30 + Math.floor((progress / rowsToImport.length) * 69),
        },
      });
    };

    let datasetEntriesToCreate;
    try {
      datasetEntriesToCreate = await prepareDatasetEntriesForImport(
        datasetFileUpload.datasetId,
        rowsToImport,
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

    await startDatasetTestJobs(datasetFileUpload.datasetId);

    await countDatasetEntryTokens.runNow();

    await prisma.datasetFileUpload.update({
      where: { id: datasetFileUploadId },
      data: {
        status: "COMPLETE",
        progress: 100,
        visible: true,
      },
    });
  },
  beforeEnqueue: async (task) => {
    await prisma.datasetFileUpload.update({
      where: {
        id: task.datasetFileUploadId,
      },
      data: {
        errorMessage: null,
        status: "PENDING",
      },
    });
  },
});
