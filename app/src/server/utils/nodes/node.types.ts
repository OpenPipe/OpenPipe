import type { NodeType, Prisma } from "@prisma/client";
import { z } from "zod";

import { filtersSchema } from "~/types/shared.types";

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
        relabelNodeId: z.string(),
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
        lastLoggedCallUpdatedAt: z
          .string()
          .transform((arg) => new Date(arg))
          .default(new Date(0).toISOString()),
        maxOutputSize: z.number().default(DEFAULT_MAX_OUTPUT_SIZE),
        sampleRate: z.number().default(1),
        filterNodeId: z.string(),
        relabelNodeId: z.string(),
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

export const typedNode = <
  T extends NodeType,
  U extends { config: Prisma.JsonValue | object },
  C extends InferNodeConfig<T>,
>(
  input: U & { type: T },
): Omit<U, "config"> & { config: C } => ({
  ...input,
  config: nodeSchema.parse(input).config as C,
});
