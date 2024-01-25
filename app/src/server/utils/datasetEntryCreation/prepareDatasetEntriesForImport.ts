import { type Prisma } from "@prisma/client";
import { shuffle } from "lodash-es";
import { type RowToImport } from "~/components/datasets/parseRowsToImport";

import {
  convertFunctionCallToToolChoice,
  convertFunctionsToTools,
  convertFunctionMessageToToolCall,
  convertFunctionMessagesToToolCall,
} from "../convertFunctionCalls";
import { hashDatasetEntryInput, hashDatasetEntryOutput } from "../nodes/hashNode";

export const prepareDatasetEntriesForImport = ({
  projectId,
  nodeId,
  dataChannelId,
  entriesToImport,
}: {
  projectId: string;
  nodeId: string;
  dataChannelId: string;
  entriesToImport: RowToImport[];
}): {
  datasetEntryInputsToCreate: Prisma.DatasetEntryInputCreateManyInput[];
  datasetEntryOutputsToCreate: Prisma.DatasetEntryOutputCreateManyInput[];
  nodeDataToCreate: Prisma.NodeDataCreateManyInput[];
} => {
  const datasetEntryInputsToCreate: Prisma.DatasetEntryInputCreateManyInput[] = [];
  const datasetEntryOutputsToCreate: Prisma.DatasetEntryOutputCreateManyInput[] = [];
  const nodeDataToCreate: Prisma.NodeDataCreateManyInput[] = [];

  for (const row of entriesToImport) {
    const tool_choice =
      row.input.tool_choice || (convertFunctionCallToToolChoice(row.input.function_call) as object);
    const tools = row.input.tools?.length
      ? row.input.tools
      : (convertFunctionsToTools(row.input.functions) as object[]);
    const inputHash = hashDatasetEntryInput({
      projectId: projectId,
      ...row.input,
    });

    datasetEntryInputsToCreate.push({
      messages: convertFunctionMessagesToToolCall(row.input.messages) as object[],
      function_call: row.input.function_call,
      functions: row.input.functions as object[],
      tool_choice,
      tools,
      // TODO: add input tokens
      inputTokens: 0,
      hash: inputHash,
    });

    const outputHash = hashDatasetEntryOutput({
      projectId,
      output: row.output,
    });

    datasetEntryOutputsToCreate.push({
      output: (convertFunctionMessageToToolCall(
        row.output,
      ) as unknown as Prisma.InputJsonValue) ?? {
        role: "assistant",
        content: "",
      },
      // TODO: add output tokens
      outputTokens: 0,
      hash: outputHash,
    });

    nodeDataToCreate.push({
      nodeId,
      dataChannelId,
      inputHash,
      outputHash,
      split: "TRAIN",
    });
  }

  // TODO: intelligently update split
  shuffle(nodeDataToCreate);
  // set first 20% to TEST split
  nodeDataToCreate.slice(0, Math.floor(nodeDataToCreate.length * 0.2)).forEach((nodeData) => {
    nodeData.split = "TEST";
  });

  return {
    datasetEntryInputsToCreate,
    datasetEntryOutputsToCreate,
    nodeDataToCreate: shuffle(nodeDataToCreate),
  };
};
