import type {
  ChatCompletion,
  ChatCompletionCreateParams,
  ChatCompletionMessageParam,
} from "openai/resources/chat";
import { z } from "zod";

export const CURRENT_PIPELINE_VERSION = 2;

export type AtLeastOne<T> = readonly [T, ...T[]];

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

export const toolCallsOutput = z.array(
  z.object({
    id: z.string(),
    function: z.object({
      name: z.string(),
      arguments: z.string(),
    }),
    type: z.literal("function"),
  }),
);

export const toolCallsOutputFunctionArguments = z.record(z.string(), z.unknown());

export const toolChoiceInput = z
  .union([
    z.literal("none"),
    z.literal("auto"),
    z.object({
      type: z.literal("function").optional(),
      function: z.object({ name: z.string() }).optional(),
    }),
  ])
  .optional();

export const toolsInput = z
  .array(
    z.object({
      function: z.object({
        name: z.string(),
        parameters: z.record(z.string(), z.unknown()),
        description: z.string().optional(),
      }),
      type: z.literal("function"),
    }),
  )
  .optional();

const chatCompletionSystemMessageParamSchema = z.object({
  role: z.literal("system"),
  content: z.union([z.string(), z.null()]),
});

const chatCompletionContentPartSchema = z.union([
  z.object({
    type: z.literal("image_url"),
    image_url: z.object({
      detail: z.union([z.literal("auto"), z.literal("low"), z.literal("high")]).optional(),
      url: z.string(),
    }),
  }),
  z.object({
    type: z.literal("text"),
    text: z.string(),
  }),
]);

const chatCompletionUserMessageParamSchema = z.object({
  role: z.literal("user"),
  content: z.union([z.string(), z.array(chatCompletionContentPartSchema), z.null()]),
});

const chatCompletionAssistantMessageParamSchema = z.object({
  role: z.literal("assistant"),
  content: z.union([z.string(), z.null()]).default(null),
  function_call: functionCallOutput.optional(),
  tool_calls: toolCallsOutput.optional(),
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

const chatCompletionInputBase = z.object({
  model: z.string(),
  messages: z.array(chatMessage),
  function_call: functionCallInput,
  functions: functionsInput,
  tool_choice: toolChoiceInput,
  tools: toolsInput,
  n: z.number().optional(),
  max_tokens: z.number().nullable().optional(),
  temperature: z.number().optional(),
  response_format: z
    .object({
      type: z.union([z.literal("text"), z.literal("json_object")]),
    })
    .optional(),
});

const chatCompletionInputStreaming = z.object({
  ...chatCompletionInputBase.shape,
  stream: z.boolean().optional(),
}) satisfies z.ZodType<ChatCompletionCreateParams, any, any>;

const chatCompletionInputNonStreaming = z.object({
  ...chatCompletionInputBase.shape,
  stream: z.literal(false),
}) satisfies z.ZodType<ChatCompletionCreateParams, any, any>;

export const chatCompletionInput = z.union([
  chatCompletionInputStreaming.passthrough(),
  chatCompletionInputNonStreaming.passthrough(),
]);

export const chatCompletionInputReqPayload = z.object({
  ...chatCompletionInputBase.shape,
  stream: z.boolean().optional(),
});

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
export const selectComparators = ["=", "!="] as const;
export const comparators = [...textComparators, ...dateComparators, ...selectComparators] as const;
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
  DatasetOutput = "Dataset Output",
  ImportId = "Import ID",
  EvalApplied = "Eval Applied",
}

export const EVALUATION_FILTERS_OUTPUT_APPENDIX = " (output)";
