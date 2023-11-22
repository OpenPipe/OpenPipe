import { type DatasetEntry, type Prisma } from "@prisma/client";
import { v4 as uuidv4 } from "uuid";

import { prisma } from "~/server/db";
import { typedDatasetEntry } from "~/types/dbColumns.types";
import { getOpenaiCompletion } from "../utils/openai";
import defineTask from "./defineTask";
import { countLlamaOutputTokens } from "~/utils/countTokens";
import { startDatasetEntryTestJobs } from "../utils/startTestJobs";
import { copyDatasetEvalDatasetEntries } from "../utils/copyDatasetEvalDatasetEntries";
import { updatePruningRuleMatches } from "../utils/updatePruningRuleMatches";

export type RelabelDatasetEntryJob = {
  authoringUserId: string;
  relabelRequestId: string;
  datasetEntryId: string;
};

export const relabelDatasetEntry = defineTask<RelabelDatasetEntryJob>({
  id: "relabelDatasetEntry",
  handler: async (task) => {
    const { authoringUserId, relabelRequestId, datasetEntryId } = task;

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
      relabelRequest.status !== "PENDING" ||
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

      const [newDatasetEntry, _outdatedDatasetEntry, _relabelRequest] = await prisma.$transaction([
        prisma.datasetEntry.create({
          data: {
            datasetId: datasetEntry.datasetId,
            messages: datasetEntry.messages,
            tool_choice: datasetEntry.tool_choice ?? undefined,
            tools: datasetEntry.tools ?? undefined,
            output: completionMessage as unknown as Prisma.InputJsonValue,
            inputTokens: datasetEntry.inputTokens,
            outputTokens: countLlamaOutputTokens(completionMessage),
            split: datasetEntry.split,
            sortKey: datasetEntry.sortKey,
            provenance: "RELABELED_BY_MODEL",
            authoringUserId,
            importId: datasetEntry.importId,
            persistentId: datasetEntry.persistentId,
          },
        }),
        prisma.datasetEntry.update({
          where: { id: datasetEntryId },
          data: {
            outdated: true,
          },
        }),
        prisma.relabelRequest.update({
          where: { id: relabelRequestId },
          data: {
            status: "COMPLETE",
          },
        }),
      ]);

      if (newDatasetEntry.split === "TEST") {
        await copyDatasetEvalDatasetEntries(datasetEntry.id, newDatasetEntry.id);
        await updatePruningRuleMatches(datasetEntry.datasetId, new Date(0), [newDatasetEntry.id]);
        await startDatasetEntryTestJobs(newDatasetEntry.id);
      }
    } catch (e) {
      await prisma.relabelRequest.update({
        where: { id: relabelRequestId },
        data: {
          status: "ERROR",
          errorMessage: (e as Error).message,
        },
      });
      throw e;
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
    await relabelDatasetEntry.enqueue({ authoringUserId, relabelRequestId, datasetEntryId });
  }
};
