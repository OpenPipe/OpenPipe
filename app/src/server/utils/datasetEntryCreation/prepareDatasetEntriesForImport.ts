import { type DatasetEntryProvenance, type Prisma } from "@prisma/client";
import { shuffle } from "lodash-es";
import { v4 as uuidv4 } from "uuid";
import { type RowToImport } from "~/components/datasets/parseRowsToImport";

import { prisma } from "~/server/db";
import {
  convertFunctionCallToToolChoice,
  convertFunctionsToTools,
  convertFunctionMessageToToolCall,
  convertFunctionMessagesToToolCall,
} from "../convertFunctionCalls";

export const prepareDatasetEntriesForImport = async (
  datasetId: string,
  entriesToImport: RowToImport[],
  provenance: DatasetEntryProvenance,
  importId: string,
  authoringUserId: string,
): Promise<(Prisma.DatasetEntryCreateManyInput & { id: string })[]> => {
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
      messages: convertFunctionMessagesToToolCall(row.input.messages) as object[],
      function_call: row.input.function_call,
      functions: row.input.functions as object[],
      tool_choice:
        row.input.tool_choice ||
        (convertFunctionCallToToolChoice(row.input.function_call) as object),
      tools: row.input.tools?.length
        ? row.input.tools
        : (convertFunctionsToTools(row.input.functions) as object[]),
      response_format: row.input.response_format,
      output: (convertFunctionMessageToToolCall(
        row.output,
      ) as unknown as Prisma.InputJsonValue) ?? {
        role: "assistant",
        content: "",
      },
      authoringUserId,
      provenance,
      split: row.split,
      sortKey: `${batchDate}-${persistentId}`,
      importId,
      persistentId,
    };
  });
};
