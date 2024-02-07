import type { DatasetEntryInput, DatasetEntryOutput, Node, Prisma } from "@prisma/client";
import { z } from "zod";

import { chatInputs } from "~/types/dbColumns.types";
import { chatCompletionMessage, filtersSchema } from "~/types/shared.types";

export const DEFAULT_MAX_OUTPUT_SIZE = 50000;

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

export enum ArchiveOutputs {
  Entries = "entries",
}

export enum MonitorOutputs {
  MatchedLogs = "Matched Logs",
}

export enum LLMRelabelOutputs {
  Relabeled = "relabeled",
  Unprocessed = "unprocessed",
}

export enum ManualRelabelOutputs {
  Relabeled = "relabeled",
  Unprocessed = "unprocessed",
}

export enum DatasetOutputs {
  Entries = "entries",
}

export const nodeSchema = z.discriminatedUnion("type", [
  z
    .object({
      type: z.literal("Archive"),
      config: z
        .object({
          maxOutputSize: z.number().default(DEFAULT_MAX_OUTPUT_SIZE),
        })
        .passthrough(),
    })
    .passthrough(),
  z
    .object({
      type: z.literal("Monitor"),
      config: z
        .object({
          initialFilters: filtersSchema,
          checkFilters: filtersSchema,
          lastLoggedCallUpdatedAt: z.date().default(new Date(0)),
          maxEntriesPerMinute: z.number().default(100),
          maxLLMConcurrency: z.number().default(2),
          maxOutputSize: z.number().default(DEFAULT_MAX_OUTPUT_SIZE),
        })
        .passthrough(),
    })
    .passthrough(),
  z.object({
    type: z.literal("LLMRelabel"),
    config: z
      .object({
        relabelLLM: z.enum(relabelOptions).default(RelabelOptions.GPT40613),
        maxEntriesPerMinute: z.number().default(100),
        maxLLMConcurrency: z.number().default(2),
      })
      .passthrough(),
  }),
  z
    .object({
      type: z.literal("ManualRelabel"),
      config: z
        .object({
          nodeId: z.string(),
        })
        .passthrough(),
    })
    .passthrough(),
  z
    .object({
      type: z.literal("Dataset"),
      config: z
        .object({
          llmRelabelNodeId: z.string(),
          manualRelabelNodeId: z.string(),
        })
        .passthrough(),
    })
    .passthrough(),
]);

export type InferNodeConfig<T extends z.infer<typeof nodeSchema>["type"]> = Extract<
  z.infer<typeof nodeSchema>,
  { type: T }
>["config"];

export const typedNode = <T extends Pick<Node, "type"> & { config: Prisma.JsonValue | object }>(
  input: T,
): Omit<T, "type" | "config"> & z.infer<typeof nodeSchema> => nodeSchema.parse(input);

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

const datasetEntryOutput = z
  .object({
    output: chatCompletionMessage,
  })
  .passthrough();

export const typedDatasetEntryOutput = <T extends Pick<DatasetEntryOutput, "output">>(
  input: T,
): Omit<T, "output"> &
  // @ts-expect-error zod doesn't type `passthrough()` correctly.
  z.infer<typeof datasetEntryOutput> => datasetEntryOutput.parse(input);

const nodeData = z.intersection(datasetEntryInput, datasetEntryOutput.passthrough());

export const typedNodeData = <
  T extends Pick<DatasetEntryInput, "messages" | "tool_choice" | "tools" | "response_format"> &
    Pick<DatasetEntryOutput, "output">,
>(
  input: T,
): Omit<T, "messages" | "tool_choice" | "tools" | "response_format" | "output"> &
  z.infer<typeof nodeData> =>
  // @ts-expect-error zod doesn't type `passthrough()` correctly.
  nodeData.parse(input);
