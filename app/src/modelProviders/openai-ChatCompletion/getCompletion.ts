/* eslint-disable @typescript-eslint/no-unsafe-call */
import { isArray, isString } from "lodash-es";
import { APIError } from "openai";
import { type ChatCompletion, type CompletionCreateParams } from "openai/resources/chat";
import mergeChunks from "openpipe/src/openai/mergeChunks";
import { openai } from "~/server/utils/openai";
import { type CompletionResponse } from "../types";

export async function getCompletion(
  input: CompletionCreateParams,
  onStream: ((partialOutput: ChatCompletion) => void) | null,
): Promise<CompletionResponse<ChatCompletion>> {
  const start = Date.now();
  let finalCompletion: ChatCompletion | null = null;

  try {
    if (onStream) {
      const resp = await openai.chat.completions.create(
        { ...input, stream: true },
        {
          maxRetries: 0,
        },
      );
      for await (const part of resp) {
        finalCompletion = mergeChunks(finalCompletion, part);
        onStream(finalCompletion);
      }
      if (!finalCompletion) {
        return {
          type: "error",
          message: "Streaming failed to return a completion",
          autoRetry: false,
        };
      }
    } else {
      const resp = await openai.chat.completions.create(
        { ...input, stream: false },
        {
          maxRetries: 0,
        },
      );
      finalCompletion = resp;
    }
    const timeToComplete = Date.now() - start;

    return {
      type: "success",
      statusCode: 200,
      value: finalCompletion,
      timeToComplete,
    };
  } catch (error: unknown) {
    if (error instanceof APIError) {
      // The types from the sdk are wrong
      const rawMessage = error.message as string | string[];
      // If the message is not a string, stringify it
      const message = isString(rawMessage)
        ? rawMessage
        : isArray(rawMessage)
        ? rawMessage.map((m) => m.toString()).join("\n")
        : (rawMessage as any).toString();
      return {
        type: "error",
        message,
        autoRetry: error.status === 429 || error.status === 503,
        statusCode: error.status,
      };
    } else {
      console.error(error);
      return {
        type: "error",
        message: (error as Error).message,
        autoRetry: true,
      };
    }
  }
}
