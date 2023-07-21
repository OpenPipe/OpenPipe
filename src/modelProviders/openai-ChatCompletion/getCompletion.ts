/* eslint-disable @typescript-eslint/no-unsafe-call */
import {
  type ChatCompletionChunk,
  type ChatCompletion,
  type CompletionCreateParams,
} from "openai/resources/chat";
import { countOpenAIChatTokens } from "~/utils/countTokens";
import { type CompletionResponse } from "../types";
import { omit } from "lodash-es";
import { openai } from "~/server/utils/openai";
import { type OpenAIChatModel } from "~/server/types";
import { truthyFilter } from "~/utils/utils";
import { APIError } from "openai";
import { modelStats } from "../modelStats";

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
  let promptTokens: number | undefined = undefined;
  let completionTokens: number | undefined = undefined;

  try {
    if (onStream) {
      const resp = await openai.chat.completions.create(
        { ...input, stream: true },
        {
          maxRetries: 0,
        },
      );
      for await (const part of resp) {
        finalCompletion = mergeStreamedChunks(finalCompletion, part);
        onStream(finalCompletion);
      }
      if (!finalCompletion) {
        return {
          type: "error",
          message: "Streaming failed to return a completion",
          autoRetry: false,
        };
      }
      try {
        promptTokens = countOpenAIChatTokens(
          input.model as keyof typeof OpenAIChatModel,
          input.messages,
        );
        completionTokens = countOpenAIChatTokens(
          input.model as keyof typeof OpenAIChatModel,
          finalCompletion.choices.map((c) => c.message).filter(truthyFilter),
        );
      } catch (err) {
        // TODO handle this, library seems like maybe it doesn't work with function calls?
        console.error(err);
      }
    } else {
      const resp = await openai.chat.completions.create(
        { ...input, stream: false },
        {
          maxRetries: 0,
        },
      );
      finalCompletion = resp;
      promptTokens = resp.usage?.prompt_tokens ?? 0;
      completionTokens = resp.usage?.completion_tokens ?? 0;
    }
    const timeToComplete = Date.now() - start;

    const stats = modelStats[input.model as keyof typeof OpenAIChatModel];
    let cost = undefined;
    if (stats && promptTokens && completionTokens) {
      cost = promptTokens * stats.promptTokenPrice + completionTokens * stats.completionTokenPrice;
    }

    return {
      type: "success",
      statusCode: 200,
      value: finalCompletion,
      timeToComplete,
      promptTokens,
      completionTokens,
      cost,
    };
  } catch (error: unknown) {
    console.error("ERROR IS", error);
    if (error instanceof APIError) {
      return {
        type: "error",
        message: error.message,
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
