/* eslint-disable @typescript-eslint/no-unsafe-call */
import {
  type ChatCompletionChunk,
  type ChatCompletion,
  type CompletionCreateParams,
} from "openai/resources/chat";
import { type CompletionResponse } from "../types";
import { isArray, isString, omit } from "lodash-es";
import { openai } from "~/server/utils/openai";
import { APIError } from "openai";
import frontendModelProvider from "./frontend";
import modelProvider, { type SupportedModel } from ".";

const mergeStreamedChunks = (
  base: ChatCompletion | null,
  chunk: ChatCompletionChunk,
): ChatCompletion => {
  if (base === null) {
    return mergeStreamedChunks({ ...chunk, choices: [] }, chunk);
  }

  const choices = [...base.choices];
  for (const choice of chunk.choices) {
    const baseChoice = choices.find((c) => c.index === choice.index);
    if (baseChoice) {
      baseChoice.finish_reason = choice.finish_reason ?? baseChoice.finish_reason;
      baseChoice.message = baseChoice.message ?? { role: "assistant" };

      if (choice.delta?.content)
        baseChoice.message.content =
          ((baseChoice.message.content as string) ?? "") + (choice.delta.content ?? "");
      if (choice.delta?.function_call) {
        const fnCall = baseChoice.message.function_call ?? {};
        fnCall.name =
          ((fnCall.name as string) ?? "") + ((choice.delta.function_call.name as string) ?? "");
        fnCall.arguments =
          ((fnCall.arguments as string) ?? "") +
          ((choice.delta.function_call.arguments as string) ?? "");
      }
    } else {
      // @ts-expect-error the types are correctly telling us that finish_reason
      // could be null, but don't want to fix it right now.
      choices.push({ ...omit(choice, "delta"), message: { role: "assistant", ...choice.delta } });
    }
  }

  const merged: ChatCompletion = {
    ...base,
    choices,
  };

  return merged;
};

export async function getCompletion(
  input: CompletionCreateParams,
  onStream: ((partialOutput: ChatCompletion) => void) | null,
): Promise<CompletionResponse<ChatCompletion>> {
  const start = Date.now();
  let finalCompletion: ChatCompletion | null = null;

  try {
    if (onStream) {
      console.log("got started");
      const resp = await openai.chat.completions.create(
        { ...input, stream: true },
        {
          maxRetries: 0,
        },
      );
      for await (const part of resp) {
        console.log("got part", part);
        finalCompletion = mergeStreamedChunks(finalCompletion, part);
        onStream(finalCompletion);
      }
      console.log("got final", finalCompletion);
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
