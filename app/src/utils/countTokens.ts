import { type ChatCompletionMessageParam } from "openai/resources/chat";
import { GPTTokens } from "gpt-tokens";
import llamaTokenizer from "llama-tokenizer-js";

import { type SupportedModel } from "~/modelProviders/openai-ChatCompletion";

interface GPTTokensMessageItem {
  name?: string;
  role: "system" | "user" | "assistant";
  content: string;
}

export const countOpenAIChatTokens = (
  messages: ChatCompletionMessageParam[],
  model: SupportedModel = "gpt-3.5-turbo-0613",
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

export const countLlamaChatTokensInMessages = (messages: ChatCompletionMessageParam[]) => {
  const stringToTokenize = messages
    .map((message) => message.content || JSON.stringify(message.function_call))
    .join("\n");
  return countLlamaChatTokens(stringToTokenize);
};

export const countLlamaChatTokens = (stringToTokenize: string) => {
  const tokens = llamaTokenizer.encode(stringToTokenize);
  return tokens.length;
};
