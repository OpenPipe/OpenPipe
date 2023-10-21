import { GPTTokens } from "gpt-tokens";
import llamaTokenizer from "llama-tokenizer-js";
import { type ChatCompletionMessage, type ChatCompletionMessageParam } from "openai/resources/chat";

import { serializeChatInput, serializeChatOutput } from "~/modelProviders/fine-tuned/serializers";
import { type SupportedModel } from "~/modelProviders/openai-ChatCompletion";

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
    content: message.content ?? JSON.stringify(message.function_call),
  }));
  return new GPTTokens({
    model,
    messages: reformattedMessages as unknown as GPTTokensMessageItem[],
  }).usedTokens;
};

export const countLlamaTokens = (input: string) => llamaTokenizer.encode(input).length;

export const countLlamaInputTokens = (input: Parameters<typeof serializeChatInput>[0]) =>
  countLlamaTokens(serializeChatInput(input, { pipelineVersion: 2 }));

export const countLlamaOutputTokens = (output: ChatCompletionMessage) =>
  countLlamaTokens(serializeChatOutput(output));
