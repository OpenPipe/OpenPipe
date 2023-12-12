import { type Prisma } from "@prisma/client";
import {
  isParseError,
  isRowToImport,
  parseRowsToImport,
} from "~/components/datasets/parseRowsToImport";
import { prisma } from "~/server/db";
import { downloadBlobToStrings } from "~/utils/azure/server";
import { prepareDatasetEntriesForImport } from "../utils/datasetEntryCreation/prepareDatasetEntriesForImport";
import { startDatasetTestJobs } from "../utils/startTestJobs";
import { updatePruningRuleMatches } from "../utils/updatePruningRuleMatches";
import defineTask from "./defineTask";
import { countDatasetEntryTokens } from "./fineTuning/countDatasetEntryTokens.task";

export type ImportDatasetEntriesJob = {
  datasetFileUploadId: string;
  authoringUserId: string;
};

export const importDatasetEntries = defineTask<ImportDatasetEntriesJob>({
  id: "importDatasetEntries",
  handler: async (task) => {
    const { datasetFileUploadId, authoringUserId } = task;
    const datasetFileUpload = await prisma.datasetFileUpload.findUnique({
      where: { id: datasetFileUploadId },
    });

    const updateDatasetFileUpload = async (data: Prisma.DatasetFileUploadUpdateInput) =>
      prisma.datasetFileUpload.update({
        where: { id: datasetFileUploadId },
        data,
      });

    if (!datasetFileUpload) {
      await updateDatasetFileUpload({
        errorMessage: "Dataset File Upload not found",
        status: "ERROR",
      });
      return;
    }
    await updateDatasetFileUpload({
      status: "DOWNLOADING",
      progress: 5,
    });

    const onBlobDownloadProgress = async (progress: number) => {
      await updateDatasetFileUpload({
        progress: 5 + Math.floor((progress / datasetFileUpload.fileSize) * 60),
      });
    };

    const rawRows = await downloadBlobToStrings(datasetFileUpload.blobName, onBlobDownloadProgress);

    const rowsToImport = parseRowsToImport(rawRows);

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

    await updateDatasetFileUpload({
      status: "PROCESSING",
      progress: 60,
    });

    const importId = new Date().toISOString();
    let datasetEntriesToCreate;
    try {
      datasetEntriesToCreate = await prepareDatasetEntriesForImport(
        datasetFileUpload.datasetId,
        goodRows,
        "UPLOAD",
        importId,
        authoringUserId,
      );
    } catch (e: unknown) {
      await updateDatasetFileUpload({
        errorMessage: `Error preparing rows: ${(e as Error).message}`,
        status: "ERROR",
        visible: true,
      });
      return;
    }

    await updateDatasetFileUpload({
      status: "SAVING",
      progress: 70,
    });

    // split datasetEntriesToCreate into chunks of 1000 because if we try too many at once Prisma throws a `RangeError: Invalid string length`
    for (let i = 0; i < datasetEntriesToCreate.length; i += 1000) {
      const chunk = datasetEntriesToCreate.slice(i, i + 1000);
      await prisma.datasetEntry.createMany({
        data: chunk,
      });

      await updatePruningRuleMatches(
        datasetFileUpload.datasetId,
        new Date(0),
        chunk.map((entry) => entry.id),
      );

      await updateDatasetFileUpload({
        progress: 70 + Math.floor(25 * (i / datasetEntriesToCreate.length)),
      });
    }

    await updateDatasetFileUpload({ progress: 95 });

    await startDatasetTestJobs(datasetFileUpload.datasetId);

    await updateDatasetFileUpload({ progress: 99 });

    await countDatasetEntryTokens.enqueue();

    await updateDatasetFileUpload({
      status: "COMPLETE",
      progress: 100,
      visible: true,
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
