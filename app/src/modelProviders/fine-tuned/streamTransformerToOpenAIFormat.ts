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

const FUNCTION_CALL_TAG = "<function>";
const FUNCTION_ARGS_TAG = "<arguments>";

export function transformChunk(chunk: any, input: ChatCompletionCreateParams) {
  // console.log(chunk);
  const transformedChunk = {
    id: chunk.id,
    object: "chat.completion.chunk",
    created: chunk.created,
    model: input.model,
    choices: chunk.choices,
    usage: chunk.usage,
  } as ChatCompletionChunk;

  // OpenAI returns a "tool_calls" finish_reason when we pass tools in the input, even if the response was a regular content.
  if (transformedChunk.choices?.[0]?.finish_reason === "stop" && input.tools?.length) {
    transformedChunk.choices[0].finish_reason = "tool_calls";
  }

  return transformedChunk;
}

export function transformStreamToolCallToOpenAIFormat(
  originalStream: Stream<any>,
  input: ChatCompletionCreateParams,
): Stream<ChatCompletionChunk> {
  const controller = new AbortController();

  async function* iterator() {
    let buffer = "";
    let inArguments = false;
    let functionIndex = 0; // The index of the function in the tool_calls array
    let functionId = generateOpenAiFunctionCallId(); // The index of the function in the tool_calls array
    let role: null | string = null;
    let call: "CONTENT" | "TOOL" | "UNKNOWN" = "UNKNOWN";

    for await (const chunk of originalStream) {
      if (chunk.choices[0].delta.role) {
        role = chunk.choices[0].delta.role;
      }
      // console.log(chunk.choices[0].delta.role);
      if (call === "UNKNOWN") {
        buffer += chunk.choices[0]?.delta.content ?? "";
      }
      // Wait for at least 5 characters in the buffer before deciding if it's a tool call stream
      if (call === "UNKNOWN" && buffer.trim().length >= 5) {
        call = buffer.trim().startsWith(FUNCTION_CALL_TAG.substring(0, 5)) ? "TOOL" : "CONTENT";
        buffer = buffer.slice(0, -chunk.choices[0]?.delta.content.length) ?? ""; // Remove the last chunk from the buffer

        if (call === "CONTENT") {
          // Yield role as the first chunk
          if (role) {
            yield {
              id: chunk.id,
              object: "chat.completion.chunk",
              created: chunk.created,
              model: input.model,
              choices: [
                {
                  delta: { role, content: "" },
                  index: 0,
                  finish_reason: null,
                  logprobs: null,
                },
              ],
              usage: null,
            } as ChatCompletionChunk;
            role = null;
          }
          // Yield the accumulated buffer as a first chunk after a role
          yield transformChunk(
            {
              ...chunk,
              choices: [
                {
                  ...chunk.choices[0],
                  delta: { ...chunk.choices[0].delta, content: buffer },
                },
              ],
            },
            input,
          );
          buffer = "";
        }
      }

      if (call === "TOOL") {
        const transformedChunk = transformChunkToolCallToOpenAIFormat(
          chunk,
          buffer,
          inArguments,
          functionIndex,
          functionId,
        );
        buffer = transformedChunk.buffer;
        inArguments = transformedChunk.inArguments;
        functionIndex = transformedChunk.functionIndex;
        functionId = transformedChunk.functionId;

        if (transformedChunk.toolCall || chunk.usage) {
          yield {
            id: chunk.id,
            object: "chat.completion.chunk",
            created: chunk.created,
            model: input.model,
            choices: [
              {
                delta: {
                  ...(role && { role }),
                  tool_calls: [transformedChunk.toolCall],
                },
                index: 0,
                finish_reason: chunk.usage ? "tool_calls" : null,
                logprobs: null,
              },
            ],
            usage: chunk.usage ?? null,
          } as ChatCompletionChunk;
          role = null;
        }
      } else if (call === "CONTENT") {
        yield transformChunk(chunk, input);
      }
    }
  }

  return new Stream(iterator, controller);
}

export function transformChunkToolCallToOpenAIFormat(
  chunk: any,
  buffer: string,
  inArguments: boolean,
  functionIndex: number,
  functionId: string,
) {
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
      functionIndex++;
      functionId = generateOpenAiFunctionCallId();
    } else {
      argumentsToYeld = buffer;
      buffer = "";
    }
  }

  let toolCall;
  if (functionNameToYield) {
    toolCall = {
      index: functionIndex,
      id: functionId,
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

  return { buffer, inArguments, functionIndex, functionId, toolCall };
}

export function generateOpenAiFunctionCallId(): string {
  return "call_" + Array.from({ length: 24 }, () => Math.random().toString(36)[2]).join("");
}
