import type { ChatCompletionChunk, ChatCompletionCreateParams } from "openai/resources/chat";
import { Stream } from "openai/streaming";
import { CompletionUsage } from "openai/resources";

const FUNCTION_CALL_TAG = "<function>";
const FUNCTION_ARGS_TAG = "<arguments>";

export type ChatCompletionChunkWithUsage = ChatCompletionChunk & { usage?: CompletionUsage };

export function transformStreamToOpenAIFormat(
  originalStream: Stream<any>,
  input: ChatCompletionCreateParams,
): Stream<ChatCompletionChunk> {
  const controller = new AbortController();

  async function* iterator() {
    let call: "CONTENT" | "TOOL" | "UNKNOWN" = "UNKNOWN";
    let buffer = "";
    let inArguments = false;
    let functionIndex = 0; // The index of the function in the tool_calls array
    let functionId = generateOpenAiFunctionCallId(); // The index of the function in the tool_calls array
    let role: null | string = "assistant";

    for await (const chunk of originalStream) {
      if (chunk.choices[0].delta.role) {
        role = chunk.choices[0].delta.role;
      }

      if (call === "UNKNOWN") {
        buffer += chunk.choices[0]?.delta.content ?? "";
      }
      // Wait for at least 5 characters in the buffer before deciding if it's a tool call stream
      if (call === "UNKNOWN" && buffer.trim().length >= 5) {
        call = buffer.trim().startsWith(FUNCTION_CALL_TAG.substring(0, 5)) ? "TOOL" : "CONTENT";
        buffer = buffer.slice(0, -chunk.choices[0]?.delta.content.length) ?? ""; // Remove the last chunk from the buffer.

        if (call === "CONTENT") {
          // Yield role as the first chunk
          if (role) {
            yield constructOpenAIChunk(
              {
                ...chunk,
                choices: chunk.choices.map(() => ({
                  delta: { role, content: "" },
                  index: 0,
                  finish_reason: null,
                  logprobs: null,
                })),
              },
              input,
            );
            role = null;
          }
          // Yield the accumulated buffer as a first chunk after a role
          yield constructOpenAIChunk(
            {
              ...chunk,
              choices: chunk.choices.map((choice: any) => ({
                ...choice,
                delta: { ...choice.delta, content: buffer },
              })),
            },
            input,
          );

          buffer = "";
        }
      }

      if (call === "TOOL") {
        const transformedChunk = deserealizeToolCallSteamToOpenAIFormat(
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
          if (role) {
            yield constructOpenAIChunk(
              {
                ...chunk,
                choices: constructOpenAITollCallChoices(chunk, {
                  ...(role && { role, content: "" }),
                }),
              },
              input,
            );
            role = null;
          }

          yield constructOpenAIChunk(
            {
              ...chunk,
              choices: constructOpenAITollCallChoices(chunk, {
                ...(transformedChunk.toolCall && { tool_calls: [transformedChunk.toolCall] }),
              }),
            },
            input,
          );
        }
      } else if (call === "CONTENT") {
        yield constructOpenAIChunk(chunk, input);
      }
    }
  }

  return new Stream(iterator, controller);
}

export function deserealizeToolCallSteamToOpenAIFormat(
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
    const startIndex = buffer.lastIndexOf(FUNCTION_CALL_TAG) + FUNCTION_CALL_TAG.length;
    const endIndex = buffer.indexOf(FUNCTION_ARGS_TAG, startIndex);
    if (endIndex !== -1) {
      functionNameToYield = buffer.substring(startIndex, endIndex).trim();
      buffer = buffer.substring(endIndex + FUNCTION_ARGS_TAG.length);
      inArguments = true;
    }
  } else if (inArguments) {
    const functionTagIndex = buffer.indexOf("<");
    if (functionTagIndex !== -1) {
      // Check if the tag is a <function> tag, or just another tag that we should stream.
      const potentialFunctionTag = buffer.substring(
        functionTagIndex,
        functionTagIndex + FUNCTION_CALL_TAG.length,
      );
      if (potentialFunctionTag === FUNCTION_CALL_TAG) {
        // New function call detected, reset
        inArguments = false;
        functionIndex++;
        functionId = generateOpenAiFunctionCallId();
        // Yield the arguments before the <function tag
        if (functionTagIndex > 0) {
          argumentsToYeld = buffer.substring(0, functionTagIndex);
        }
        buffer = buffer.substring(functionTagIndex); // Keep the <function tag in the buffer for the next iteration
      } else if (buffer.length >= functionTagIndex + FUNCTION_CALL_TAG.length) {
        // If it's not a <function> tag, yield all the content
        argumentsToYeld = buffer;
        buffer = ""; // Clear the buffer
      }
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

export function constructOpenAIChunk(chunk: any, input: ChatCompletionCreateParams) {
  const transformedChunk = {
    id: chunk.id,
    object: "chat.completion.chunk",
    created: chunk.created,
    model: input.model,
    choices: chunk.choices,
    usage: chunk.usage ?? null,
  } as ChatCompletionChunk;

  // OpenAI returns the "tool_calls" finish_reason when we pass tools in the input, even if the response was a regular content.
  if (transformedChunk.choices?.[0]?.finish_reason === "stop" && input.tools?.length) {
    transformedChunk.choices[0].finish_reason = "tool_calls";
  }

  return transformedChunk;
}

export function constructOpenAITollCallChoices(chunk: any, delta: any) {
  return chunk.choices.map((choice: any) => ({
    delta,
    index: 0,
    finish_reason: chunk.usage ? "tool_calls" : null,
    logprobs: null,
  }));
}

export function generateOpenAiFunctionCallId(): string {
  return "call_" + Array.from({ length: 24 }, () => Math.random().toString(36)[2]).join("");
}
