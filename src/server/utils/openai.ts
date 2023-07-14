import { omit } from "lodash";
import { env } from "~/env.mjs";

import OpenAI from "openai";
import {
  type ChatCompletion,
  type ChatCompletionChunk,
  type CompletionCreateParams,
} from "openai/resources/chat";

export const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });

export const mergeStreamedChunks = (
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

export const streamChatCompletion = async function* (body: CompletionCreateParams) {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  const resp = await openai.chat.completions.create({
    ...body,
    stream: true,
  });

  let mergedChunks: ChatCompletion | null = null;
  for await (const part of resp) {
    mergedChunks = mergeStreamedChunks(mergedChunks, part);
    yield mergedChunks;
  }
};
