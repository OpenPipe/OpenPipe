import { type OpenpipeChatInput } from ".";

export const templateOpenOrcaPrompt = (messages: OpenpipeChatInput["messages"]) => {
  const splitter = "<|end_of_turn|>"; // end of turn splitter

  const formattedMessages = messages.map((message) => {
    if (message.role === "system" || message.role === "user") {
      return "User: " + message.content;
    } else {
      return "Assistant: " + message.content;
    }
  });

  let prompt = formattedMessages.join(splitter);

  // Ensure that the prompt ends with an assistant message
  const lastUserIndex = prompt.lastIndexOf("User:");
  const lastAssistantIndex = prompt.lastIndexOf("Assistant:");
  if (lastUserIndex > lastAssistantIndex) {
    prompt += splitter + "Assistant:";
  }

  return prompt;
};
