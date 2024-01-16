import { type DatasetEntry, type Prisma } from "@prisma/client";
import { v4 as uuidv4 } from "uuid";

import { prisma } from "~/server/db";
import { typedDatasetEntry } from "~/types/dbColumns.types";
import { getOpenaiCompletion } from "../utils/openai";
import defineTask from "./defineTask";
import { copyEntryWithUpdates } from "~/server/utils/datasetEntryCreation/copyEntryWithUpdates";
import { calculateQueryDelay } from "./generateTestSetEntry.task";

export type RelabelDatasetEntryJob = {
  authoringUserId: string;
  relabelRequestId: string;
  datasetEntryId: string;
  numPreviousTries: number;
};

const MAX_TRIES = 25;

export const relabelDatasetEntry = defineTask<RelabelDatasetEntryJob>({
  id: "relabelDatasetEntry",
  handler: async (task) => {
    const { authoringUserId, relabelRequestId, datasetEntryId, numPreviousTries } = task;

    const [relabelRequest, rawDatasetEntry] = await prisma.$transaction([
      prisma.relabelRequest.findUnique({
        where: { id: relabelRequestId },
      }),
      prisma.datasetEntry.findUnique({
        where: { id: datasetEntryId },
        include: {
          dataset: true,
        },
      }),
    ]);

    if (
      !relabelRequest ||
      (relabelRequest.status !== "PENDING" && relabelRequest.status !== "ERROR") ||
      !rawDatasetEntry ||
      !rawDatasetEntry.dataset
    )
      return;

    if (rawDatasetEntry.outdated) {
      await prisma.relabelRequest.update({
        where: { id: relabelRequestId },
        data: {
          status: "ERROR",
          errorMessage: "Dataset entry was edited after the relabel request was created.",
        },
      });
      return;
    }

    await prisma.relabelRequest.update({
      where: { id: relabelRequestId },
      data: {
        status: "IN_PROGRESS",
        errorMessage: null,
      },
    });

    const datasetEntry = typedDatasetEntry(rawDatasetEntry);

    let completion;
    const input = {
      model: "gpt-4",
      messages: datasetEntry.messages,
      tool_choice: datasetEntry.tool_choice ?? undefined,
      tools: datasetEntry.tools ?? undefined,
    };
    try {
      completion = await getOpenaiCompletion(rawDatasetEntry.dataset.projectId, input);

      const completionMessage = completion.choices[0]?.message;
      if (!completionMessage) throw new Error("No completion returned");

      await copyEntryWithUpdates(datasetEntryId, authoringUserId, "RELABELED_BY_MODEL", {
        output: completionMessage as unknown as Prisma.JsonValue,
      });

      await prisma.relabelRequest.update({
        where: { id: relabelRequestId },
        data: {
          status: "COMPLETE",
        },
      });
    } catch (e) {
      const shouldRetry = numPreviousTries < MAX_TRIES;
      if (shouldRetry) {
        await relabelDatasetEntry.enqueue(
          {
            ...task,
            numPreviousTries: numPreviousTries + 1,
          },
          {
            runAt: new Date(Date.now() + calculateQueryDelay(numPreviousTries, 60 * 60 * 1000)),
            priority: 3,
          },
        );
        await prisma.relabelRequest.update({
          where: { id: relabelRequestId },
          data: {
            status: "PENDING",
          },
        });
      } else {
        await prisma.relabelRequest.update({
          where: { id: relabelRequestId },
          data: {
            status: "ERROR",
            errorMessage: (e as Error).message,
          },
        });
      }
    }
  },
  specDefaults: {
    priority: 5,
  },
});

export const queueRelabelDatasetEntries = async (
  batchId: string,
  authoringUserId: string,
  datasetEntries: DatasetEntry[],
) => {
  const relabelRequestsToCreate: Prisma.RelabelRequestCreateManyInput[] = [];
  for (const datasetEntry of datasetEntries) {
    relabelRequestsToCreate.push({
      id: uuidv4(),
      batchId,
      datasetEntryPersistentId: datasetEntry.persistentId,
      status: "PENDING",
    });
  }
  await prisma.relabelRequest.createMany({
    data: relabelRequestsToCreate,
  });

  for (let i = 0; i < datasetEntries.length; i++) {
    const relabelRequestId = relabelRequestsToCreate[i]?.id;
    const datasetEntryId = datasetEntries[i]?.id;
    if (!relabelRequestId || !datasetEntryId) continue;
    await relabelDatasetEntry.enqueue({
      authoringUserId,
      relabelRequestId,
      datasetEntryId,
      numPreviousTries: 0,
    });
  }
};
