import {
  isParseError,
  isRowToImport,
  parseRowsToImport,
} from "~/components/datasets/parseRowsToImport";
import { prisma } from "~/server/db";
import { downloadBlobToString } from "~/utils/azure/server";
import { prepareDatasetEntriesForImport } from "../utils/prepareDatasetEntriesForImport";
import { updatePruningRuleMatches } from "../utils/updatePruningRuleMatches";
import defineTask from "./defineTask";
import { startDatasetTestJobs } from "../utils/startTestJobs";
import { countDatasetEntryTokens } from "./fineTuning/countDatasetEntryTokens.task";
import { captureException } from "@sentry/browser";

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

    const errorRows = rowsToImport.filter(isParseError);
    const goodRows = rowsToImport.filter(isRowToImport);

    if (!goodRows.length || errorRows.length > goodRows.length) {
      const error = errorRows[0]?.error ?? "No lines to import";
      const line = errorRows[0]?.line ?? 0;

      await prisma.datasetFileUpload.update({
        where: { id: datasetFileUploadId },
        data: {
          errorMessage: `Invalid JSONL on line ${line}: ${error}`,
          status: "ERROR",
        },
      });
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
        goodRows,
        "UPLOAD",
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
        progress: 90,
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

    try {
      await countDatasetEntryTokens.runNow();
    } catch (e) {
      // Catch this error since if counting tokens fails we don't want
      // to redo the whole import
      captureException(e);
    }

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
