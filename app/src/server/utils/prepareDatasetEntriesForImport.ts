import { type Prisma } from "@prisma/client";
import { shuffle } from "lodash-es";
import { type ChatCompletionMessageParam } from "openai/resources/chat";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import { type RowToImport } from "~/components/datasets/parseRowsToImport";

import { prisma } from "~/server/db";
import { chatMessage } from "~/types/shared.types";
import { countLlamaChatTokensInMessages } from "~/utils/countTokens";

type CreateManyInput = Omit<Prisma.DatasetEntryCreateManyInput, "id"> & { id: string };

export const prepareDatasetEntriesForImport = async (
  datasetId: string,
  trainingRows: RowToImport[],
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
  const batchDate = Date.now();
  let i = 0;
  for (const row of trainingRows) {
    if (updateCallback && i % updateFrequency === 0) await updateCallback(i);
    let outputTokens = 0;
    if (row.output) {
      outputTokens = countLlamaChatTokensInMessages([
        row.output as unknown as ChatCompletionMessageParam,
      ]);
    }
    const persistentId = uuidv4();
    datasetEntriesToCreate.push({
      id: uuidv4(),
      datasetId: datasetId,
      messages: row.input.messages as object[],
      function_call: row.input.function_call as object,
      functions: row.input.functions as object[],
      output: (row.output as unknown as Prisma.InputJsonValue) ?? {
        role: "assistant",
        content: "",
      },
      // TODO: need to count tokens based on the full input, not just messages
      inputTokens: countLlamaChatTokensInMessages(z.array(chatMessage).parse(row.input.messages)),
      outputTokens,
      type: typesToAssign.pop() as "TRAIN" | "TEST",
      sortKey: `${batchDate}-${persistentId}`,
      persistentId,
    });
    i++;
  }

  return datasetEntriesToCreate;
};
