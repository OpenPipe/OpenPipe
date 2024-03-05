import { type Prisma } from "@prisma/client";

import { prisma } from "~/server/db";
import { downloadBlobToStrings } from "~/utils/azure/server";
import {
  isParseError,
  isRowToImport,
  parseRowsToImport,
} from "~/server/utils/datasetEntryCreation/parseRowsToImport";
import { prepareDatasetEntriesForImport } from "../datasetEntryCreation/prepareDatasetEntriesForImport";
import { enqueueCountDatasetEntryTokens } from "~/server/tasks/fineTuning/countDatasetEntryTokens.task";
import { generatePersistentId } from "./utils";

export const importDatasetEntries = async ({
  projectId,
  nodeId,
  dataChannelId,
  datasetFileUploadId,
  maxEntriesToImport,
}: {
  projectId: string;
  nodeId: string;
  dataChannelId: string;
  datasetFileUploadId: string;
  maxEntriesToImport: number;
}) => {
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
    progress: 15,
  });

  const onBlobDownloadProgress = async (progress: number) => {
    await updateDatasetFileUpload({
      progress: 15 + Math.floor((progress / datasetFileUpload.fileSize) * 55),
    });
  };

  const rawRows = await downloadBlobToStrings({
    blobName: datasetFileUpload.blobName,
    // account for up to 50% errored lines
    maxEntriesToImport: maxEntriesToImport * 2,
    onProgress: onBlobDownloadProgress,
  });

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
    progress: 70,
  });

  const importTime = new Date();

  const entriesToImport = goodRows.slice(0, maxEntriesToImport).map((row, index) => ({
    ...row,
    persistentId: generatePersistentId({
      creationTime: importTime,
      key: index.toString(),
      nodeId,
    }),
  }));

  let datasetEntryInputsToCreate: Prisma.DatasetEntryInputCreateManyInput[];
  let datasetEntryOutputsToCreate: Prisma.DatasetEntryOutputCreateManyInput[];
  let nodeEntriesToCreate: Prisma.NodeEntryCreateManyInput[];
  try {
    ({ datasetEntryInputsToCreate, datasetEntryOutputsToCreate, nodeEntriesToCreate } =
      await prepareDatasetEntriesForImport({
        projectId,
        dataChannelId,
        entriesToImport,
        onProgress: async (progress) => {
          await updateDatasetFileUpload({ progress: 70 + Math.floor(10 * progress) });
        },
      }));
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
    progress: 80,
  });

  // save datasetEntryInputs in batches of 1000
  for (let i = 0; i < datasetEntryInputsToCreate.length; i += 1000) {
    const chunk = datasetEntryInputsToCreate.slice(i, i + 1000);
    await prisma.datasetEntryInput.createMany({
      data: chunk,
      skipDuplicates: true,
    });
    await updateDatasetFileUpload({
      progress: 80 + Math.floor(10 * (i / datasetEntryInputsToCreate.length)),
    });
  }

  // save datasetEntryOutputs in batches of 1000
  for (let i = 0; i < datasetEntryOutputsToCreate.length; i += 1000) {
    const chunk = datasetEntryOutputsToCreate.slice(i, i + 1000);
    await prisma.datasetEntryOutput.createMany({
      data: chunk,
      skipDuplicates: true,
    });
    await updateDatasetFileUpload({
      progress: 90 + Math.floor(5 * (i / datasetEntryOutputsToCreate.length)),
    });
  }

  // save nodeEntries in batches of 1000
  for (let i = 0; i < nodeEntriesToCreate.length; i += 1000) {
    const chunk = nodeEntriesToCreate.slice(i, i + 1000);
    await prisma.nodeEntry.createMany({
      data: chunk,
      skipDuplicates: true,
    });
    await updateDatasetFileUpload({
      progress: 95 + Math.floor(4 * (i / nodeEntriesToCreate.length)),
    });
  }

  await updateDatasetFileUpload({ progress: 99 });

  await enqueueCountDatasetEntryTokens({ projectId });
};
