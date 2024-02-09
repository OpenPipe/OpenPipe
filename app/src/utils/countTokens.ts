import { type supportModelType, GPTTokens } from "gpt-tokens";
import llamaTokenizer from "llama-tokenizer-js";
import { type ChatCompletionMessage, type ChatCompletionMessageParam } from "openai/resources/chat";

import { serializeChatInput, serializeChatOutput } from "~/modelProviders/fine-tuned/serializers";
import { type SupportedModel } from "~/modelProviders/openai-ChatCompletion";
import { CURRENT_PIPELINE_VERSION } from "~/types/shared.types";

interface GPTTokensMessageItem {
  name?: string;
  role: "system" | "user" | "assistant";
  content: string;
}

export const countOpenAIChatTokens = (
  model: SupportedModel,
  messages: ChatCompletionMessageParam[],
) => {
  const reformattedMessages = messages.map((message) => ({
    role: message.role,
    // Not completely accurate, but gives a rough idea of the token count
    content:
      message.content ||
      JSON.stringify("function_call" in message ? message.function_call : "") ||
      JSON.stringify("tool_calls" in message ? message.tool_calls : "") ||
      "",
  }));

  return new GPTTokens({
    model: getSupportedModel(model),
    messages: reformattedMessages as unknown as GPTTokensMessageItem[],
  }).usedTokens;
};

// "gpt-tokens" does not support new models. This is a temporary workaround.
function getSupportedModel(model: string): supportModelType {
  const modelMapping: Record<string, supportModelType> = {
    "gpt-4-0125-preview": "gpt-4-1106-preview",
    "gpt-3.5-turbo-0125": "gpt-3.5-turbo-1106",
  };

  return modelMapping[model] || (model as supportModelType);
}

export const countLlamaTokens = (input: string) => llamaTokenizer.encode(input).length;

export const countLlamaInputTokens = (input: Parameters<typeof serializeChatInput>[0]) =>
  countLlamaTokens(serializeChatInput(input, { pipelineVersion: CURRENT_PIPELINE_VERSION }));

export const countLlamaOutputTokens = (output: ChatCompletionMessage) =>
  countLlamaTokens(serializeChatOutput(output));
