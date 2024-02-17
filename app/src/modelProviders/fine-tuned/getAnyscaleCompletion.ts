import { v4 as uuidv4 } from "uuid";
import type {
  ChatCompletion,
  ChatCompletionChunk,
  ChatCompletionCreateParams,
} from "openai/resources/chat";

import OpenAI from "openai";
import { type TypedFineTune } from "~/types/dbColumns.types";
import { deserializeChatOutput, serializeChatInput } from "./serializers";
import { env } from "~/env.mjs";
import { Stream } from "openai/streaming";

const deployments = ["a100", "a10"] as const;

const clients = env.ANYSCALE_INFERENCE_BASE_URL
  ? {
      a100: new OpenAI({
        baseURL: env.ANYSCALE_INFERENCE_BASE_URL,
        apiKey: env.ANYSCALE_INFERENCE_API_KEY,
      }),
      a10: new OpenAI({
        baseURL: env.ANYSCALE_INFERENCE_BASE_URL.replace("/v1", "/a10-v1/v1"),
        apiKey: env.ANYSCALE_INFERENCE_API_KEY,
      }),
    }
  : null;

export async function getAnyscaleCompletion(
  fineTune: TypedFineTune,
  input: ChatCompletionCreateParams,
): Promise<ChatCompletion | Stream<ChatCompletionChunk>> {
  const deployment =
    env.ANYSCALE_ENABLE_A100 &&
    fineTune.pipelineVersion === 3 &&
    fineTune.baseModel === "OpenPipe/mistral-ft-optimized-1227" &&
    !fineTune.forceA10
      ? "a100"
      : "a10";

  const client = clients?.[deployment];
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

  const resp = await client.chat.completions.create({
    model: `${fineTune.baseModel}:${fineTune.id}:1`,
    messages: [{ role: "system", content: templatedPrompt }],
    temperature: input.temperature ?? 0,
    n: input.n ?? 1,
    max_tokens: input.max_tokens ?? undefined,
    stream: input.stream ?? false,
  });

  if (resp instanceof Stream) {
    return transformStream(resp);
  }

  const convertToFunctions = (input.functions?.length ?? 0) > 0;

  const choices = resp.choices.map((choice) => ({
    ...choice,
    message: deserializeChatOutput(choice.message.content?.trim() ?? "", convertToFunctions),
  }));

  if (!resp.usage) {
    throw new Error("No usage data returned");
  }

  return {
    id: `as-${uuidv4()}-${deployment === "a10" ? "10" : "100"}`,
    object: "chat.completion",
    created: resp.created,
    model: input.model,
    choices,
    usage: resp.usage,
  };
}

function transformStream(originalStream: Stream<ChatCompletionChunk>): Stream<ChatCompletionChunk> {
  const controller = new AbortController();

  async function* iterator() {
    for await (const chunk of originalStream) {
      const transformedChunk = transformChunk(chunk);
      yield transformedChunk;
    }
  }

  return new Stream(iterator, controller);
}

function transformChunk(chunk: any) {
  return {
    id: chunk.id,
    object: "chat.completion.chunk",
    created: chunk.created,
    model: chunk.model,
    choices: chunk.choices,
    usage: chunk.usage,
  } as ChatCompletionChunk;
}
