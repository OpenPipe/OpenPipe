import type { DatasetEntryInput, Node } from "@prisma/client";
import { z } from "zod";

import { chatInputs } from "~/types/dbColumns.types";
import { filtersSchema } from "~/types/shared.types";

export enum RelabelOptions {
  GPT40613 = "gpt-4-0613",
  GPT41106 = "gpt-4-1106-preview",
  GPT432k = "gpt-4-32k",
  SkipRelabel = "skip relabeling",
}

export const relabelOptions = [
  RelabelOptions.GPT40613,
  RelabelOptions.GPT41106,
  RelabelOptions.GPT432k,
  RelabelOptions.SkipRelabel,
] as const;

export enum MonitorOutputs {
  MatchedLogs = "Matched Logs",
}

export enum LLMRelabelOutputs {
  Relabeled = "relabeled",
  Unprocessed = "unprocessed",
}

const node = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("Monitor"),
    config: z.object({
      initialFilters: filtersSchema,
      checkFilters: filtersSchema,
      lastLoggedCallUpdatedAt: z.date().default(new Date(0)),
      maxEntriesPerMinute: z.number().default(100),
      maxLLMConcurrency: z.number().default(2),
      maxOutputSize: z.number().default(20000),
    }),
  }),
  z.object({
    type: z.literal("LLMRelabel"),
    config: z.object({
      relabelLLM: z.enum(relabelOptions),
      maxEntriesPerMinute: z.number().default(100),
      maxLLMConcurrency: z.number().default(2),
      maxOutputSize: z.number().default(20000),
    }),
  }),
]);

export const typedNode = <T extends Pick<Node, "type" | "config">>(
  input: T,
): Omit<T, "type" | "config"> & z.infer<typeof node> => node.parse(input);

const datasetEntryInput = z
  .object({
    messages: chatInputs.messages,
    tool_choice: chatInputs.tool_choice.nullable(),
    tools: chatInputs.tools.nullable(),
    response_format: chatInputs.response_format.nullable(),
  })
  .passthrough();

export const typedDatasetEntryInput = <
  T extends Pick<DatasetEntryInput, "messages" | "tool_choice" | "tools" | "response_format">,
>(
  input: T,
): Omit<T, "messages" | "tool_choice" | "tools" | "response_format"> &
  // @ts-expect-error zod doesn't type `passthrough()` correctly.
  z.infer<typeof datasetEntryInput> => datasetEntryInput.parse(input);
