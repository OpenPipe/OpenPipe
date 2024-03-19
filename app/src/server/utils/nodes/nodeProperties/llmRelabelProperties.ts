import { NodeEntryStatus } from "@prisma/client";
import { APIError } from "openai";

import { kysely } from "~/server/db";
import { getOpenaiCompletion } from "~/server/utils/openai";
import { type NodeProperties } from "./nodeProperties.types";
import { RelabelOption, llmRelabelNodeSchema } from "../node.types";

export enum LLMRelabelOutput {
  Relabeled = "relabeled",
}

export const llmRelabelProperties: NodeProperties<"LLMRelabel"> = {
  schema: llmRelabelNodeSchema,
  cacheMatchFields: ["incomingInputHash"],
  cacheWriteFields: ["outgoingOutputHash"],
  readBatchSize: 50,
  outputs: [{ label: LLMRelabelOutput.Relabeled }],
  hashableFields: (node) => ({ relabelLLM: node.config.relabelLLM }),
  getConcurrency: (node) => {
    return node.config.maxLLMConcurrency;
  },
  beforeProcessing: async (node) => {
    if (node.config.relabelLLM === RelabelOption.SkipRelabel) {
      await kysely
        .updateTable("NodeEntry as ne")
        .set({ status: "PROCESSED" })
        .from("DataChannel as dc")
        .where("dc.destinationId", "=", node.id)
        .whereRef("ne.dataChannelId", "=", "dc.id")
        .where("ne.status", "=", "PENDING")
        .execute();
    }
  },
  processEntry: async ({ node, entry }) => {
    const { tool_choice, tools, messages, response_format } = entry;

    try {
      let completionMessage;
      if (node.config.relabelLLM === RelabelOption.SkipRelabel) {
        completionMessage = entry.output;
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
    } catch (e) {
      if (e instanceof APIError && e.status === 429) {
        return {
          status: NodeEntryStatus.PENDING,
          error: (e as Error).message ?? "Rate limited",
        } as const;
      } else {
        return {
          nodeEntryId: entry.id,
          status: NodeEntryStatus.ERROR,
          error: (e as Error).message ?? "Unknown error",
        } as const;
      }
    }
  },
};
