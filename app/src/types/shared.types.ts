import { pick } from "lodash-es";
import type {
  ChatCompletion,
  ChatCompletionCreateParams,
  ChatCompletionMessage,
} from "openai/resources/chat";
import { z } from "zod";

export const CURRENT_PIPELINE_VERSION = 2;

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

const chatMessageRole = z.union([
  z.literal("user"),
  z.literal("assistant"),
  z.literal("system"),
  z.literal("function"),
]);

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

export const chatMessage = z.object({
  role: chatMessageRole,
  content: z.union([z.string(), z.null()]),
  function_call: functionCallOutput.optional(),
}) satisfies z.ZodType<ChatCompletionMessage, any, any>;

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
  object: z.string(),
  created: z.number(),
  model: z.string(),
  choices: z.array(
    z.object({
      finish_reason: z.union([z.literal("stop"), z.literal("length"), z.literal("function_call")]),
      index: z.number(),
      message: chatMessage,
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
