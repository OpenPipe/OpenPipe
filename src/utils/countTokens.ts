import { type ChatCompletion } from "openai/resources/chat";
import { GPTTokens } from "gpt-tokens";
import { type OpenAIChatModel } from "~/server/types";

interface GPTTokensMessageItem {
  name?: string;
  role: "system" | "user" | "assistant";
  content: string;
}

export const countOpenAIChatTokens = (
  model: keyof typeof OpenAIChatModel,
  messages: ChatCompletion.Choice.Message[],
) => {
  return new GPTTokens({ model, messages: messages as unknown as GPTTokensMessageItem[] })
    .usedTokens;
};
