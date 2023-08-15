import { ChatCompletion, ChatCompletionChunk } from "openai-beta/resources/chat";

export default function mergeChunks(
  base: ChatCompletion | null,
  chunk: ChatCompletionChunk
): ChatCompletion {
  if (base === null) {
    return mergeChunks({ ...chunk, choices: [] }, chunk);
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
}
