import { NodeEntryStatus } from "@prisma/client";

import { getOpenaiCompletion } from "~/server/utils/openai";
import { LLMRelabelOutput, type NodeProperties } from "./nodeProperties.types";
import { RelabelOption, llmRelabelNodeSchema } from "../node.types";

export const llmRelabelProperties: NodeProperties<"LLMRelabel"> = {
  schema: llmRelabelNodeSchema,
  cacheMatchFields: ["incomingInputHash"],
  cacheWriteFields: ["outgoingOutputHash"],
  readBatchSize: 10,
  outputs: [{ label: LLMRelabelOutput.Relabeled }],
  hashableFields: (node) => ({ relabelLLM: node.config.relabelLLM }),
  getConcurrency: (node) => {
    return node.config.maxLLMConcurrency;
  },
  shouldSkipProcessing: (node) => node.config.relabelLLM === RelabelOption.SkipRelabel,
  processEntry: async ({ node, entry }) => {
    const { tool_choice, tools, messages, response_format, output } = entry;

    let completionMessage;
    if (node.config.relabelLLM === RelabelOption.SkipRelabel) {
      completionMessage = output;
    } else {
      const completion = await getOpenaiCompletion(node.projectId, {
        model: node.config.relabelLLM,
        messages,
        tool_choice: tool_choice ?? undefined,
        tools: tools ?? undefined,
        response_format: response_format ?? undefined,
      });

      completionMessage = completion.choices[0]?.message;
      if (!completionMessage) throw new Error("No completion returned");
    }

    return {
      status: NodeEntryStatus.PROCESSED,
      output: completionMessage,
    } as const;
  },
};
