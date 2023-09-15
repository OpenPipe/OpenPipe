import { type Prisma } from "@prisma/client";
import { shuffle } from "lodash-es";
import {
  type CreateChatCompletionRequestMessage,
  type ChatCompletion,
} from "openai/resources/chat";

import { prisma } from "~/server/db";
import { type TrainingRow } from "~/components/datasets/validateTrainingRows";
import { countLlamaChatTokensInMessages } from "~/utils/countTokens";

export const formatEntriesFromTrainingRows = async (
  datasetId: string,
  trainingRows: TrainingRow[],
  updateCallback?: (progress: number) => Promise<void>,
  updateFrequency = 1000,
) => {
  const [dataset, existingTrainingCount, existingTestingCount] = await prisma.$transaction([
    prisma.dataset.findUnique({ where: { id: datasetId } }),
    prisma.datasetEntry.count({
      where: {
        datasetId,
        type: "TRAIN",
      },
    }),
    prisma.datasetEntry.count({
      where: {
        datasetId,
        type: "TEST",
      },
    }),
  ]);

  const trainingRatio = dataset?.trainingRatio ?? 0.8;

  const newTotalEntries = existingTrainingCount + existingTestingCount + trainingRows.length;
  const numTrainingToAdd = Math.floor(trainingRatio * newTotalEntries) - existingTrainingCount;
  const numTestingToAdd = trainingRows.length - numTrainingToAdd;
  const typesToAssign = shuffle([
    ...Array(numTrainingToAdd).fill("TRAIN"),
    ...Array(numTestingToAdd).fill("TEST"),
  ]);
  const datasetEntriesToCreate: Prisma.DatasetEntryCreateManyInput[] = [];
  let i = 0;
  for (const row of trainingRows) {
    // console.log(row);
    if (updateCallback && i % updateFrequency === 0) await updateCallback(i);
    let outputTokens = 0;
    if (row.output) {
      outputTokens = countLlamaChatTokensInMessages([
        row.output as unknown as ChatCompletion.Choice.Message,
      ]);
    }
    // console.log("outputTokens", outputTokens);
    datasetEntriesToCreate.push({
      datasetId: datasetId,
      input: row.input as unknown as Prisma.InputJsonValue,
      output: (row.output as unknown as Prisma.InputJsonValue) ?? {
        role: "assistant",
        content: "",
      },
      inputTokens: countLlamaChatTokensInMessages(
        row.input as unknown as CreateChatCompletionRequestMessage[],
      ),
      outputTokens,
      type: typesToAssign.pop() as "TRAIN" | "TEST",
    });
    i++;
  }

  return datasetEntriesToCreate;
};
