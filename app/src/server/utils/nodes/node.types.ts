import type { DatasetEntryInput, DatasetEntryOutput, Node, NodeType, Prisma } from "@prisma/client";
import { z } from "zod";

import { chatInputs } from "~/types/dbColumns.types";
import { chatCompletionMessage, filtersSchema } from "~/types/shared.types";

export const DEFAULT_MAX_OUTPUT_SIZE = 50000;

export enum RelabelOption {
  GPT351106 = "gpt-3.5-turbo-1106",
  GPT41106 = "gpt-4-1106-preview",
  GPT40613 = "gpt-4-0613",
  SkipRelabel = "skip relabeling",
}

export const relabelOptions = [
  RelabelOption.GPT351106,
  RelabelOption.GPT41106,
  RelabelOption.GPT40613,
  RelabelOption.SkipRelabel,
] as const;

export const archiveNodeSchema = z
  .object({
    type: z.literal("Archive"),
    config: z
      .object({
        maxOutputSize: z.number().default(DEFAULT_MAX_OUTPUT_SIZE),
      })
      .passthrough(),
  })
  .passthrough();

export const monitorNodeSchema = z
  .object({
    type: z.literal("Monitor"),
    config: z
      .object({
        initialFilters: filtersSchema,
        lastLoggedCallUpdatedAt: z.date().default(new Date(0)),
        maxOutputSize: z.number().default(DEFAULT_MAX_OUTPUT_SIZE),
        sampleRate: z.number().default(1),
        filterNodeId: z.string(),
      })
      .passthrough(),
  })
  .passthrough();

export const filterNodeSchema = z
  .object({
    type: z.literal("Filter"),
    config: z
      .object({
        filters: filtersSchema,
        maxLLMConcurrency: z.number().default(2),
      })
      .passthrough(),
  })
  .passthrough();

export const llmRelabelNodeSchema = z
  .object({
    type: z.literal("LLMRelabel"),
    config: z
      .object({
        relabelLLM: z.enum(relabelOptions).default(RelabelOption.SkipRelabel),
        maxLLMConcurrency: z.number().default(2),
      })
      .passthrough(),
  })
  .passthrough();

export const manualRelabelNodeSchema = z
  .object({
    type: z.literal("ManualRelabel"),
    config: z.object({}).passthrough(),
  })
  .passthrough();

export const datasetNodeSchema = z
  .object({
    type: z.literal("Dataset"),
    config: z
      .object({
        llmRelabelNodeId: z.string(),
        manualRelabelNodeId: z.string(),
      })
      .passthrough(),
  })
  .passthrough();

export const nodeSchema = z.discriminatedUnion("type", [
  archiveNodeSchema,
  monitorNodeSchema,
  filterNodeSchema,
  llmRelabelNodeSchema,
  manualRelabelNodeSchema,
  datasetNodeSchema,
]);

export type InferNodeConfig<T extends z.infer<typeof nodeSchema>["type"]> = Extract<
  z.infer<typeof nodeSchema>,
  { type: T }
>["config"];

export const typedNode = <T extends Pick<Node, "type"> & { config: Prisma.JsonValue | object }>(
  input: T,
): Omit<T, "type" | "config"> & z.infer<typeof nodeSchema> => ({
  ...input,
  ...nodeSchema.parse(input),
});

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

const nodeEntry = z.intersection(datasetEntryInput, datasetEntryOutput.passthrough());

export const typedNodeEntry = <
  T extends Pick<DatasetEntryInput, "messages" | "tool_choice" | "tools" | "response_format"> &
    Pick<DatasetEntryOutput, "output">,
>(
  input: T,
): Omit<T, "messages" | "tool_choice" | "tools" | "response_format" | "output"> &
  z.infer<typeof nodeEntry> =>
  // @ts-expect-error zod doesn't type `passthrough()` correctly.
  nodeEntry.parse(input);
