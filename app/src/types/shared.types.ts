import { pick } from "lodash-es";
import {
  type ChatCompletion,
  type ChatCompletionCreateParams,
  type ChatCompletionMessageParam,
} from "openai/resources/chat";
import { z } from "zod";

export const CURRENT_PIPELINE_VERSION = 2;

export type AtLeastOne<T> = readonly [T, ...T[]];

export const validatedChatInput = <
  T extends { messages: unknown; functions?: unknown; function_call?: unknown },
>(
  entry: T,
) => {
  // TODO: actually validate. We'll just assert the types for now.
  return pick(entry, ["messages", "functions", "function_call"]) as Pick<
    ChatCompletionCreateParams,
    "messages" | "functions" | "function_call"
  >;
};

export const functionCallOutput = z
  .object({
    name: z.string(),
    arguments: z.string(),
  })
  .optional();

export const functionCallInput = z
  .union([z.literal("none"), z.literal("auto"), z.object({ name: z.string() })])
  .optional();

export const functionsInput = z
  .array(
    z.object({
      name: z.string(),
      parameters: z.record(z.string(), z.unknown()),
      description: z.string().optional(),
    }),
  )
  .optional();

const chatCompletionSystemMessageParamSchema = z.object({
  role: z.literal("system"),
  content: z.union([z.string(), z.null()]),
});

const chatCompletionUserMessageParamSchema = z.object({
  role: z.literal("user"),
  content: z.union([z.string(), z.null()]),
});

const chatCompletionAssistantMessageParamSchema = z.object({
  role: z.literal("assistant"),
  content: z.union([z.string(), z.null()]),
  function_call: functionCallOutput.optional(),
  tool_calls: z
    .array(
      z.object({
        id: z.string(),
        function: z.object({
          name: z.string(),
          arguments: z.string(),
        }),
        type: z.literal("function"),
      }),
    )
    .optional(),
});

const chatCompletionToolMessageParamSchema = z.object({
  role: z.literal("tool"),
  content: z.union([z.string(), z.null()]),
  tool_call_id: z.string(),
});

const chatCompletionFunctionMessageParamSchema = z.object({
  role: z.literal("function"),
  name: z.string(),
  content: z.union([z.string(), z.null()]),
});

export const chatMessage = z.union([
  chatCompletionSystemMessageParamSchema,
  chatCompletionUserMessageParamSchema,
  chatCompletionAssistantMessageParamSchema,
  chatCompletionToolMessageParamSchema,
  chatCompletionFunctionMessageParamSchema,
]) satisfies z.ZodType<ChatCompletionMessageParam, any, any>;

export const chatCompletionMessage = chatCompletionAssistantMessageParamSchema;

export const chatCompletionInput = z.object({
  model: z.string(),
  messages: z.array(chatMessage),
  function_call: functionCallInput,
  functions: functionsInput,
  n: z.number().optional(),
  max_tokens: z.number().optional(),
  temperature: z.number().optional(),
  stream: z.boolean().optional(),
}) satisfies z.ZodType<ChatCompletionCreateParams, any, any>;

export const chatCompletionOutput = z.object({
  id: z.string(),
  object: z.literal("chat.completion"),
  created: z.number(),
  model: z.string(),
  choices: z.array(
    z.object({
      finish_reason: z.union([
        z.literal("length"),
        z.literal("function_call"),
        z.literal("tool_calls"),
        z.literal("stop"),
        z.literal("content_filter"),
      ]),
      index: z.number(),
      message: chatCompletionMessage,
    }),
  ),
  usage: z
    .object({
      prompt_tokens: z.number(),
      completion_tokens: z.number(),
      total_tokens: z.number(),
    })
    .optional(),
}) satisfies z.ZodType<ChatCompletion, any, any>;

export const validatedChatOutput = (output: unknown) => chatMessage.parse(output);

export enum SortOrder {
  ASC = "asc",
  DESC = "desc",
}

export const textComparators = ["=", "!=", "CONTAINS", "NOT_CONTAINS"] as const;
export const dateComparators = [
  "LAST 15M",
  "LAST 24H",
  "LAST 7D",
  "BEFORE",
  "AFTER",
  "RANGE",
] as const;
export const comparators = [...textComparators, ...dateComparators] as const;
export type ComparatorsSubsetType = typeof textComparators | typeof dateComparators;

export const filtersSchema = z.array(
  z.object({
    field: z.string(),
    comparator: z.enum(comparators),
    value: z.string().or(z.array(z.number())),
  }),
);

export enum LoggedCallsFiltersDefaultFields {
  SentAt = "Sent At",
  Request = "Request",
  Response = "Response",
  Model = "Model",
  StatusCode = "Status Code",
}

export enum GeneralFiltersDefaultFields {
  Input = "Input",
  Output = "Output",
  ImportId = "Import ID",
  RelabelBatchId = "Relabel Batch ID",
}

export enum EvaluationFiltersDefaultFields {
  Input = "Input",
  OriginalOutput = "Original Output",
  ImportId = "Import ID",
}

export const EVALUATION_FILTERS_OUTPUT_APPENDIX = " (output)";
