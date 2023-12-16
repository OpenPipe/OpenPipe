import { type ChatCompletionMessageParam } from "openai/resources/chat";
import { prisma } from "~/server/db";
import { isComparisonModel } from "./comparisonModels";

export function escapeString(input: string | undefined) {
  // Remove first and last character, which are quotes
  return JSON.stringify(input || "").slice(1, -1);
}

export function escapeLikeString(input: string | undefined) {
  return escapeString(escapeString(input || ""));
}

// If model is comparison model, this will return an empty array
export const getStringsToPrune = async (modelId: string) => {
  if (isComparisonModel(modelId)) return [];

  const pruningRules = await prisma.pruningRule.findMany({
    where: { fineTuneId: modelId },
    select: { textToMatch: true },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });
  return pruningRules.map((rule) => rule.textToMatch);
};

export const pruneInputMessages = (
  messages: ChatCompletionMessageParam[],
  stringsToPrune: string[],
) => {
  for (const stringToPrune of stringsToPrune) {
    for (const message of messages) {
      if ("content" in message && message.content) {
        const content = Array.isArray(message.content)
          ? message.content.join("\n")
          : message.content;
        message.content = content.replaceAll(stringToPrune, "");
      }
    }
  }
  messages = messages.filter(
    (message) =>
      message.content !== "" ||
      ("tool_calls" in message && message.tool_calls && message.tool_calls.length > 0),
  );
  return messages;
};
