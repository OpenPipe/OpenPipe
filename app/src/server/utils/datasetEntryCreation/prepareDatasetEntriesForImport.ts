import { type Prisma } from "@prisma/client";
import { shuffle } from "lodash-es";
import { type ChatCompletionMessage } from "openai/resources";

import { type RowToImport } from "~/components/datasets/parseRowsToImport";
import {
  convertFunctionCallToToolChoice,
  convertFunctionsToTools,
  convertFunctionMessageToToolCall,
  convertFunctionMessagesToToolCall,
} from "../convertFunctionCalls";
import { hashDatasetEntryInput, hashDatasetEntryOutput } from "../nodes/hashNode";
import { countLlamaInputTokens, countLlamaOutputTokens } from "~/utils/countTokens";

export const prepareDatasetEntriesForImport = ({
  projectId,
  nodeId,
  dataChannelId,
  entriesToImport,
}: {
  projectId: string;
  nodeId: string;
  dataChannelId: string;
  entriesToImport: (RowToImport & { importId: string; loggedCallId?: string })[];
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
      row.input.tool_choice || convertFunctionCallToToolChoice(row.input.function_call);
    const tools = row.input.tools?.length
      ? row.input.tools
      : convertFunctionsToTools(row.input.functions);
    const inputHash = hashDatasetEntryInput({
      projectId,
      ...row.input,
    });

    const messages = convertFunctionMessagesToToolCall(row.input.messages);

    datasetEntryInputsToCreate.push({
      messages: messages as object[],
      tool_choice: tool_choice as object,
      tools: tools as object[],
      inputTokens: countLlamaInputTokens({
        messages,
        tool_choice,
        tools,
      }),
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
      output: output as unknown as Prisma.InputJsonValue,
      outputTokens: countLlamaOutputTokens(output),
      hash: outputHash,
    });

    nodeDataToCreate.push({
      importId: row.importId,
      nodeId,
      dataChannelId,
      inputHash,
      outputHash,
      originalOutputHash: outputHash,
      split: "TRAIN",
      loggedCallId: row.loggedCallId,
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
