import type { ChatCompletion, ChatCompletionChunk } from "openai/resources/chat";
import { CompletionUsage } from "openai/resources/completions";

const omit = <T extends Record<string, unknown>, K extends keyof T>(
  obj: T,
  ...keys: K[]
): Omit<T, K> => {
  const ret = { ...obj };
  for (const key of keys) {
    delete ret[key];
  }
  return ret;
};

export default function mergeChunks(
  base: ChatCompletion | null,
  chunk: ChatCompletionChunk & { usage?: CompletionUsage },
): ChatCompletion {
  if (base === null) {
    return mergeChunks(
      { ...chunk, object: "chat.completion", choices: [] },
      // Prevent function call and tool call arguments from being double-merged
      {
        ...chunk,
        choices: chunk.choices.map((c) => ({
          ...c,
          delta: {
            ...c.delta,
            function_call: c.delta.function_call
              ? {
                  ...c.delta.function_call,
                }
              : undefined,
            tool_calls: c.delta.tool_calls?.map((tc) => ({
              ...tc,
              function: {
                ...tc.function,
              },
            })),
          },
        })),
      },
    );
  }

  const choices = [...base.choices];
  for (const choice of chunk.choices) {
    const baseChoice = choices.find((c) => c.index === choice.index);
    if (baseChoice) {
      baseChoice.finish_reason = choice.finish_reason ?? baseChoice.finish_reason;
      baseChoice.message = baseChoice.message ?? { role: "assistant" };

      if (choice.delta?.content)
        baseChoice.message.content =
          (baseChoice.message.content ?? "") + (choice.delta.content ?? "");
      if (choice.delta?.function_call) {
        const fnCall = baseChoice.message.function_call ?? {
          name: "",
          arguments: "",
        };
        fnCall.name = fnCall.name + (choice.delta.function_call.name ?? "");
        fnCall.arguments = fnCall.arguments + (choice.delta.function_call.arguments ?? "");
      }
      if (choice.delta?.tool_calls) {
        const toolCalls = baseChoice.message.tool_calls ?? [];
        const toolCallDelta = { ...choice.delta.tool_calls[0] };
        if (toolCallDelta?.function?.name) {
          toolCalls.push({
            id: toolCallDelta.id as string,
            type: "function",
            function: {
              name: toolCallDelta.function.name ?? "",
              arguments: toolCallDelta.function.arguments ?? "",
            },
          });
        } else if (toolCalls[toolCalls.length - 1] && toolCallDelta) {
          toolCalls[toolCalls.length - 1]!.function.arguments +=
            toolCallDelta.function?.arguments ?? "";
        }
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
    usage: chunk.usage,
  };

  return merged;
}
