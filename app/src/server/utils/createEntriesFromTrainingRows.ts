import { type Prisma } from "@prisma/client";
import { shuffle } from "lodash-es";
import { type ChatCompletionMessageParam } from "openai/resources/chat";
import { v4 as uuidv4 } from "uuid";

import { prisma } from "~/server/db";
import { type TrainingRow } from "~/components/datasets/validateTrainingRows";
import { countLlamaChatTokensInMessages } from "~/utils/countTokens";

type CreateManyInput = Omit<Prisma.DatasetEntryCreateManyInput, "id"> & { id: string };

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
  const datasetEntriesToCreate: CreateManyInput[] = [];
  let i = 0;
  for (const row of trainingRows) {
    // console.log(row);
    if (updateCallback && i % updateFrequency === 0) await updateCallback(i);
    let outputTokens = 0;
    if (row.output) {
      outputTokens = countLlamaChatTokensInMessages([
        row.output as unknown as ChatCompletionMessageParam,
      ]);
    }
    const persistentId = uuidv4();
    // console.log("outputTokens", outputTokens);
    datasetEntriesToCreate.push({
      id: uuidv4(),
      datasetId: datasetId,
      input: row.input as unknown as Prisma.InputJsonValue,
      output: (row.output as unknown as Prisma.InputJsonValue) ?? {
        role: "assistant",
        content: "",
      },
      inputTokens: countLlamaChatTokensInMessages(
        row.input as unknown as ChatCompletionMessageParam[],
      ),
      outputTokens,
      type: typesToAssign.pop() as "TRAIN" | "TEST",
      sortKey: `${Date.now()}-${persistentId}`,
      persistentId,
    });
    i++;
  }

  return datasetEntriesToCreate;
};
