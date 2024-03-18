import { type Prisma } from "@prisma/client";
import { shuffle } from "lodash-es";
import { type ChatCompletionMessage } from "openai/resources";

import { type RowToImport } from "~/server/utils/datasetEntryCreation/parseRowsToImport";
import {
  convertFunctionCallToToolChoice,
  convertFunctionsToTools,
  convertFunctionMessageToToolCall,
  convertFunctionMessagesToToolCall,
} from "../convertFunctionCalls";
import { hashDatasetEntryInput, hashDatasetEntryOutput } from "../nodes/hashNode";

type IndexedNodeEntryCreateManyInput = Prisma.NodeEntryCreateManyInput & { index: number };
export type EntryToImport = RowToImport & { persistentId: string; loggedCallId?: string };

export const prepareDatasetEntriesForImport = async ({
  projectId,
  dataChannelId,
  entriesToImport,
  onProgress,
}: {
  projectId: string;
  dataChannelId: string;
  entriesToImport: EntryToImport[];
  onProgress?: (progress: number) => Promise<void>;
}): Promise<{
  datasetEntryInputsToCreate: Prisma.DatasetEntryInputCreateManyInput[];
  datasetEntryOutputsToCreate: Prisma.DatasetEntryOutputCreateManyInput[];
  nodeEntriesToCreate: Prisma.NodeEntryCreateManyInput[];
}> => {
  const datasetEntryInputsToCreate: Prisma.DatasetEntryInputCreateManyInput[] = [];
  const datasetEntryOutputsToCreate: Prisma.DatasetEntryOutputCreateManyInput[] = [];
  const originallySplitNodeEntriesToCreate: IndexedNodeEntryCreateManyInput[] = [];
  let randomlySplitNodeEntriesToCreate: IndexedNodeEntryCreateManyInput[] = [];

  let i = 0;
  for (const row of entriesToImport) {
    const tool_choice =
      row.input.tool_choice || convertFunctionCallToToolChoice(row.input.function_call);
    const tools = row.input.tools?.length
      ? row.input.tools
      : convertFunctionsToTools(row.input.functions);

    // Update progress every 100 rows
    if (onProgress && i++ % 100 === 0) {
      await onProgress(i / entriesToImport.length);
    }

    const inputHash = hashDatasetEntryInput({
      ...row.input,
      projectId,
      tool_choice: tool_choice ?? undefined,
      tools,
    });

    const messages = convertFunctionMessagesToToolCall(row.input.messages);

    datasetEntryInputsToCreate.push({
      projectId,
      messages: messages as object[],
      tool_choice: tool_choice as object,
      tools: tools as object[],
      response_format: row.input.response_format,
      hash: inputHash,
    });

    const outputHash = hashDatasetEntryOutput({
      projectId,
      output: row.output,
    });

    const output = (convertFunctionMessageToToolCall(row.output) as ChatCompletionMessage) ?? {
      role: "assistant",
      content: "",
    };

    datasetEntryOutputsToCreate.push({
      projectId,
      output: output as unknown as Prisma.InputJsonValue,
      hash: outputHash,
    });

    const nodeEntryData = {
      persistentId: row.persistentId,
      dataChannelId,
      inputHash,
      outputHash,
      originalOutputHash: outputHash,
      loggedCallId: row.loggedCallId,
    };

    if (row.split) {
      originallySplitNodeEntriesToCreate.push({
        ...nodeEntryData,
        split: row.split,
        index: i,
      });
    } else {
      randomlySplitNodeEntriesToCreate.push({
        ...nodeEntryData,
        split: "TRAIN",
        index: i,
      });
    }
  }

  // TODO: intelligently update split
  randomlySplitNodeEntriesToCreate = shuffle(randomlySplitNodeEntriesToCreate);
  // set first 20% to TEST split
  randomlySplitNodeEntriesToCreate
    .slice(0, Math.floor(randomlySplitNodeEntriesToCreate.length * 0.2))
    .forEach((nodeEntry) => {
      nodeEntry.split = "TEST";
    });

  return {
    datasetEntryInputsToCreate,
    datasetEntryOutputsToCreate,
    nodeEntriesToCreate: [
      ...originallySplitNodeEntriesToCreate,
      ...randomlySplitNodeEntriesToCreate,
    ]
      .sort((a, b) => a.index - b.index)
      .map(({ index: _, ...rest }) => rest),
  };
};
