import { v4 as uuidv4 } from "uuid";
import type {
  ChatCompletion,
  ChatCompletionChunk,
  ChatCompletionCreateParams,
  ChatCompletionCreateParamsNonStreaming,
  ChatCompletionCreateParamsStreaming,
} from "openai/resources/chat";
import { Stream } from "openai/streaming";
import OpenAI from "openai";

import { type TypedFineTune } from "~/types/dbColumns.types";
import { deserializeChatOutput, serializeChatInput } from "./serializers";
import { env } from "~/env.mjs";
import { Transform } from "stream";

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
  input: ChatCompletionCreateParamsNonStreaming,
): Promise<ChatCompletion>;
export async function getAnyscaleCompletion(
  fineTune: TypedFineTune,
  input: ChatCompletionCreateParamsStreaming,
): Promise<Stream<ChatCompletionChunk>>;
export async function getAnyscaleCompletion(
  fineTune: TypedFineTune,
  input: ChatCompletionCreateParams,
): Promise<ChatCompletion | Stream<ChatCompletionChunk>>;
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

  // if ((input.functions || input.tools) && input.stream) {
  //   throw new Error(
  //     `We don't currently support streaming for function calls. Please open an issue if you need this functionality! https://github.com/openpipe/openpipe`,
  //   );
  // }

  const serializedInput = serializeChatInput(input, fineTune);
  const templatedPrompt = `### Instruction:\n${serializedInput}\n\n### Response:\n`;

  const resp = await client.chat.completions.create({
    model: `${fineTune.baseModel}:${fineTune.id}:1`,
    messages: [{ role: "system", content: templatedPrompt }],
    temperature: input.temperature ?? 0,
    n: input.n ?? 1,
    max_tokens: input.max_tokens ?? undefined,
    stream: input.stream,
  });

  if (resp instanceof Stream) {
    // for await (const chunk of resp) {
    //   console.log(chunk.choices);
    // }
    // return resp;
    // return transformStream(resp, input.model);
    if (input.tools?.length ?? 0 > 0) {
      return transformStreamToolCall(resp, input.model);
    } else {
      return transformStream(resp, input.model);
    }
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

function transformStream(
  originalStream: Stream<ChatCompletionChunk>,
  model: string,
): Stream<ChatCompletionChunk> {
  const controller = new AbortController();

  async function* iterator() {
    for await (const chunk of originalStream) {
      console.log(chunk.choices[0].delta);
      yield transformChunk(chunk, model);
    }
  }

  return new Stream(iterator, controller);
}

function transformChunk(chunk: any, model: string) {
  return {
    id: chunk.id,
    object: "chat.completion.chunk",
    created: chunk.created,
    model,
    choices: chunk.choices,
    usage: chunk.usage,
  } as ChatCompletionChunk;
}

function transformStreamToolCall(
  originalStream: Stream<any>,
  model: string,
): Stream<ChatCompletionChunk> {
  const controller = new AbortController();

  async function* iterator() {
    let buffer = "";
    let inArguments = false;

    for await (const chunk of originalStream) {
      console.log(chunk.choices[0]);

      const transformedChunk = transformChunkToolCall(chunk, buffer, inArguments);

      buffer = transformedChunk.buffer;
      inArguments = transformedChunk.inArguments;

      if (transformedChunk.toolCall || chunk.usage) {
        yield {
          id: chunk.id,
          object: "chat.completion.chunk",
          created: chunk.created,
          model,
          choices: [
            {
              delta: { tool_calls: [transformedChunk.toolCall] },
              index: 0,
              finish_reason: chunk.usage ? "tool_calls" : null,
              logprobs: null,
            },
          ],
          usage: chunk.usage ?? null,
        } as ChatCompletionChunk;
      }
    }
  }

  return new Stream(iterator, controller);
}

const FUNCTION_CALL_TAG = "<function>";
const FUNCTION_ARGS_TAG = "<arguments>";

function transformChunkToolCall(chunk: any, buffer: string, inArguments: boolean) {
  buffer += chunk.choices[0]?.delta.content ?? "";
  let functionNameToYield: string = "";
  let argumentsToYeld: string = "";

  if (!inArguments && buffer.includes(FUNCTION_CALL_TAG)) {
    // Getting a function name by waits untill the buffer has a values like: <function>get_current_weather<arguments>
    const startIndex = buffer.lastIndexOf(FUNCTION_CALL_TAG) + FUNCTION_CALL_TAG.length;
    const endIndex = buffer.indexOf(FUNCTION_ARGS_TAG, startIndex);
    if (endIndex !== -1) {
      functionNameToYield = buffer.substring(startIndex, endIndex).trim();
      buffer = buffer.substring(endIndex + FUNCTION_ARGS_TAG.length);
      inArguments = true; // The next iteration will not check for function names, just yield the arguments
    }
  } else if (inArguments) {
    if (buffer.startsWith("<")) {
      // New function call detected, reset
      inArguments = false;
    } else {
      argumentsToYeld = buffer;
      buffer = "";
    }
  }

  let toolCall;
  if (functionNameToYield) {
    toolCall = {
      index: 0,
      id: "",
      type: "function",
      function: {
        name: functionNameToYield,
        arguments: argumentsToYeld,
      },
    };

    functionNameToYield = "";
  } else if (argumentsToYeld) {
    toolCall = {
      index: 0,
      function: {
        arguments: argumentsToYeld,
      },
    };
  }

  return { buffer, inArguments, toolCall };
}
