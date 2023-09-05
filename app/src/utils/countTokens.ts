import { type ChatCompletion } from "openai/resources/chat";
import { GPTTokens } from "gpt-tokens";
import { type SupportedModel } from "~/modelProviders/openai-ChatCompletion";

interface GPTTokensMessageItem {
  name?: string;
  role: "system" | "user" | "assistant";
  content: string;
}

export const countOpenAIChatTokens = (
  model: SupportedModel,
  messages: ChatCompletion.Choice.Message[],
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
