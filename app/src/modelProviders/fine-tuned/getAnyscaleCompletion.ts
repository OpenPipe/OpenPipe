/* eslint-disable @typescript-eslint/no-unsafe-call */
import type {
  ChatCompletion,
  ChatCompletionCreateParams,
  ChatCompletionMessage,
} from "openai/resources/chat";

import OpenAI from "openai";
import { convertToolCallMessageToFunction } from "~/server/utils/convertFunctionCalls";
import { type TypedFineTune } from "~/types/dbColumns.types";
import { deserializeChatOutput, serializeChatInput } from "./serializers";
import { env } from "~/env.mjs";

const client = env.ANYSCALE_INFERENCE_BASE_URL
  ? new OpenAI({
      baseURL: env.ANYSCALE_INFERENCE_BASE_URL,
      apiKey: env.ANYSCALE_INFERENCE_API_KEY,
    })
  : null;

export async function getAnyscaleCompletion(
  fineTune: TypedFineTune,
  input: ChatCompletionCreateParams,
): Promise<ChatCompletion> {
  if (!client) {
    throw new Error("Not configured for Anyscale inference");
  }

  if (fineTune.pipelineVersion < 3) {
    throw new Error(
      `Error: completion mismatch. This function is only supported for models with pipeline version 3+ Model: ${fineTune.slug}. Pipeline ${fineTune.pipelineVersion}`,
    );
  }

  const serializedInput = serializeChatInput(input, fineTune);
  const templatedPrompt = `### Instruction:\n${serializedInput}\n\n### Response:\n`;

  if (input.stream) {
    throw new Error("Streaming is not yet supported");
  }

  const resp = await client.chat.completions.create({
    model: `${fineTune.baseModel}:${fineTune.id}:1`,
    messages: [{ role: "system", content: templatedPrompt }],
    temperature: input.temperature ?? 0,
    n: input.n ?? 1,
    max_tokens: input.max_tokens ?? undefined,
  });

  let choices = resp.choices.map((choice, i) => ({
    index: i,
    message: deserializeChatOutput(choice.message.content?.trim() ?? ""),
    finish_reason: choice.finish_reason,
  }));
  if (input.functions?.length) {
    // messages will automatically be deserialized to tool_calls, but the user might expect a function_call
    choices = choices.map((choice) => ({
      ...choice,
      message: convertToolCallMessageToFunction(choice.message) as ChatCompletionMessage,
    }));
  }

  if (!resp.usage) {
    throw new Error("No usage data returned");
  }

  return {
    id: resp.id,
    object: "chat.completion",
    created: Date.now(),
    model: input.model,
    // @ts-expect-error TODO: Fix this, logprobs missing?
    choices,
    usage: {
      prompt_tokens: resp.usage.prompt_tokens,
      completion_tokens: resp.usage.completion_tokens,
      total_tokens: resp.usage.prompt_tokens + resp.usage.completion_tokens,
    },
  };
}
