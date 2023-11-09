import { type DatasetEntryProvenance, type Prisma } from "@prisma/client";
import { shuffle } from "lodash-es";
import { v4 as uuidv4 } from "uuid";
import { type RowToImport } from "~/components/datasets/parseRowsToImport";

import { prisma } from "~/server/db";
import {
  convertFunctionCall,
  convertFunctions,
  convertMessage,
  convertMessages,
} from "./convertFunctionCalls";

export const prepareDatasetEntriesForImport = async (
  datasetId: string,
  entriesToImport: RowToImport[],
  provenance: DatasetEntryProvenance,
  importId: string,
  authoringUserId: string,
) => {
  const [dataset, existingTrainingCount, existingCount] = await prisma.$transaction([
    prisma.dataset.findUnique({ where: { id: datasetId } }),
    prisma.datasetEntry.count({
      where: {
        datasetId,
        split: "TRAIN",
      },
    }),
    prisma.datasetEntry.count({
      where: {
        datasetId,
      },
    }),
  ]);

  const trainingRatio = dataset?.trainingRatio ?? 0.8;

  const newTotalEntries = existingCount + entriesToImport.length;
  const numTrainingToAdd = Math.floor(trainingRatio * newTotalEntries) - existingTrainingCount;

  let numTrainingAdded = entriesToImport.filter((row) => row.split === "TRAIN").length;
  const entriesWithSplit = shuffle(entriesToImport).map((row) => {
    let split = row.split;
    if (!split) {
      if (numTrainingAdded < numTrainingToAdd) {
        split = "TRAIN";
        numTrainingAdded++;
      } else {
        split = "TEST";
      }
    }
    return { ...row, split };
  });

  const batchDate = Date.now();

  return shuffle(entriesWithSplit).map((row) => {
    const persistentId = uuidv4();

    return {
      id: uuidv4(),
      datasetId: datasetId,
      messages: convertMessages(row.input.messages) as object[],
      function_call: row.input.function_call as object,
      functions: row.input.functions as object[],
      tool_choice:
        row.input.tool_choice || (convertFunctionCall(row.input.function_call) as object),
      tools: row.input.tools || (convertFunctions(row.input.functions) as object[]),
      output: (convertMessage(row.output) as unknown as Prisma.InputJsonValue) ?? {
        role: "assistant",
        content: "",
      },
      inputTokens: 0,
      outputTokens: 0,
      authoringUserId,
      provenance,
      split: row.split,
      sortKey: `${batchDate}-${persistentId}`,
      importId,
      persistentId,
    };
  });
};
