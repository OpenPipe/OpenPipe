import { isObject, pick } from "lodash-es";
import type { ChatCompletionCreateParams, ChatCompletionMessage } from "openai/resources/chat";
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

const outputSchema = z.object({
  role: z.literal("assistant"),
  content: z.union([z.string(), z.null()]),
  function_call: z
    .object({
      name: z.string(),
      description: z.string().optional(),
      arguments: z.string(),
    })
    .optional(),
});

export const validatedChatOutput = (output: unknown): ChatCompletionMessage =>
  outputSchema.parse(output);

const FUNCTION_CALL_TAG = "<function>";
const FUNCTION_ARGS_TAG = "<arguments>";

export const serializeChatOutput = (output: ChatCompletionMessage) => {
  let formatted: string;
  if (output?.function_call) {
    formatted = FUNCTION_CALL_TAG + output.function_call.name;
    if (output.function_call.arguments) {
      formatted += FUNCTION_ARGS_TAG + output.function_call.arguments;
    }
  } else {
    formatted = output?.content ?? "";
  }
  return formatted;
};

export const deserializeChatOutput = (completion: string): ChatCompletionMessage => {
  const message: ChatCompletionMessage = {
    role: "assistant",
    content: null,
  };

  if (completion.trim().startsWith(FUNCTION_CALL_TAG)) {
    const functionName = completion.split(FUNCTION_CALL_TAG)[1]?.split(FUNCTION_ARGS_TAG)[0];
    const functionArgs = completion.split(FUNCTION_ARGS_TAG)[1];
    message.function_call = { name: functionName as string, arguments: functionArgs ?? "" };
  } else {
    message.content = completion;
  }
  return message;
};

export const serializeChatInput = (
  input: Pick<ChatCompletionCreateParams, "messages" | "function_call" | "functions">,
  fineTune: { pipelineVersion: number; id?: string },
) => {
  if (fineTune.pipelineVersion === 1) {
    return JSON.stringify(input.messages);
  } else if (fineTune.pipelineVersion === 2) {
    let functions: string[] | null = null;
    if (input.function_call === "none") {
      functions = null;
    } else if (isObject(input.function_call) && "name" in input.function_call) {
      functions = [input.function_call.name];
    } else if (input.functions) {
      functions = input.functions?.map((fn) => fn.name) ?? [];
    }
    const toSerialize = functions
      ? { messages: input.messages, functions }
      : { messages: input.messages };
    return JSON.stringify(toSerialize);
  } else {
    throw new Error(`Invalid pipeline version for finetune ${fineTune?.id ?? "unknown"}`);
  }
};
