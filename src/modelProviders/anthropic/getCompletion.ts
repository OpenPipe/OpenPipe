import { env } from "~/env.mjs";
import { type CompletionResponse } from "../types";

import Anthropic, { APIError } from "@anthropic-ai/sdk";
import { type Completion, type CompletionCreateParams } from "@anthropic-ai/sdk/resources";
import { isObject, isString } from "lodash-es";

const anthropic = new Anthropic({
  apiKey: env.ANTHROPIC_API_KEY,
});

export async function getCompletion(
  input: CompletionCreateParams,
  onStream: ((partialOutput: Completion) => void) | null,
): Promise<CompletionResponse<Completion>> {
  const start = Date.now();
  let finalCompletion: Completion | null = null;

  try {
    if (onStream) {
      const resp = await anthropic.completions.create(
        { ...input, stream: true },
        {
          maxRetries: 0,
        },
      );

      for await (const part of resp) {
        if (finalCompletion === null) {
          finalCompletion = part;
        } else {
          finalCompletion = { ...part, completion: finalCompletion.completion + part.completion };
        }
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
      const resp = await anthropic.completions.create(
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
    console.log("CAUGHT ERROR", error);
    if (error instanceof APIError) {
      const message =
        isObject(error.error) &&
        "error" in error.error &&
        isObject(error.error.error) &&
        "message" in error.error.error &&
        isString(error.error.error.message)
          ? error.error.error.message
          : error.message;

      return {
        type: "error",
        message,
        autoRetry: error.status === 429 || error.status === 503,
        statusCode: error.status,
      };
    } else {
      return {
        type: "error",
        message: (error as Error).message,
        autoRetry: true,
      };
    }
  }
}
