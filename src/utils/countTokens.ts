import { type ChatCompletion } from "openai/resources/chat";
import { GPTTokens } from "gpt-tokens";
import { type OpenAIChatModels } from "~/server/types";

interface GPTTokensMessageItem {
  name?: string;
  role: "system" | "user" | "assistant";
  content: string;
}

export const countOpenAIChatTokens = (
  model: OpenAIChatModels,
  messages: ChatCompletion.Choice.Message[]
) => {
  return new GPTTokens({ model, messages: messages as unknown as GPTTokensMessageItem[] })
    .usedTokens;
};
