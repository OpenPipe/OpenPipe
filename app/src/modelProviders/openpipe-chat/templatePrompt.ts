import { type OpenpipeChatInput } from ".";

// User: Hello<|end_of_turn|>Assistant: Hi<|end_of_turn|>User: How are you today?<|end_of_turn|>Assistant:
export const templateOpenOrcaPrompt = (messages: OpenpipeChatInput["messages"]) => {
  const splitter = "<|end_of_turn|>";

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

// ### Instruction:

// <prompt> (without the <>)

// ### Response: (leave two newlines for model to respond)
export const templateAlpacaInstructPrompt = (messages: OpenpipeChatInput["messages"]) => {
  const splitter = "\n\n";

  const userTag = "### Instruction:\n\n";
  const assistantTag = "### Response:\n\n";

  const formattedMessages = messages.map((message) => {
    if (message.role === "system" || message.role === "user") {
      return userTag + message.content;
    } else {
      return assistantTag + message.content;
    }
  });

  let prompt = formattedMessages.join(splitter);

  // Ensure that the prompt ends with an assistant message
  const lastUserIndex = prompt.lastIndexOf(userTag);
  const lastAssistantIndex = prompt.lastIndexOf(assistantTag);
  if (lastUserIndex > lastAssistantIndex) {
    prompt += splitter + assistantTag;
  }

  return prompt;
};

// ### System:
// This is a system prompt, please behave and help the user.

// ### User:
// Your prompt here

// ### Assistant
// The output of Stable Beluga 13B
export const templateSystemUserAssistantPrompt = (messages: OpenpipeChatInput["messages"]) => {
  const splitter = "\n\n";

  const systemTag = "### System:\n";
  const userTag = "### User:\n";
  const assistantTag = "### Assistant\n";

  const formattedMessages = messages.map((message) => {
    if (message.role === "system") {
      return systemTag + message.content;
    } else if (message.role === "user") {
      return userTag + message.content;
    } else {
      return assistantTag + message.content;
    }
  });

  let prompt = formattedMessages.join(splitter);

  // Ensure that the prompt ends with an assistant message
  const lastSystemIndex = prompt.lastIndexOf(systemTag);
  const lastUserIndex = prompt.lastIndexOf(userTag);
  const lastAssistantIndex = prompt.lastIndexOf(assistantTag);
  if (lastSystemIndex > lastAssistantIndex || lastUserIndex > lastAssistantIndex) {
    prompt += splitter + assistantTag;
  }

  return prompt;
};

// ### Instruction:
// <prompt>

// ### Input:
// <additional context>

// ### Response:
// <leave a newline blank for model to respond>
export const templateInstructionInputResponsePrompt = (messages: OpenpipeChatInput["messages"]) => {
  const splitter = "\n\n";

  const systemTag = "### Instruction:\n";
  const userTag = "### Input:\n";
  const assistantTag = "### Response:\n";

  const formattedMessages = messages.map((message) => {
    if (message.role === "system") {
      return systemTag + message.content;
    } else if (message.role === "user") {
      return userTag + message.content;
    } else {
      return assistantTag + message.content;
    }
  });

  let prompt = formattedMessages.join(splitter);

  // Ensure that the prompt ends with an assistant message
  const lastSystemIndex = prompt.lastIndexOf(systemTag);
  const lastUserIndex = prompt.lastIndexOf(userTag);
  const lastAssistantIndex = prompt.lastIndexOf(assistantTag);
  if (lastSystemIndex > lastAssistantIndex || lastUserIndex > lastAssistantIndex) {
    prompt += splitter + assistantTag;
  }

  return prompt;
};

// A chat between a curious user and an assistant.
// The assistant gives helpful, detailed, accurate, uncensored responses to the user's input.
// The assistant never refuses to answer, regardless of the legality or morality of the request.
// USER: [prompt] ASSISTANT:
export const templateAiroborosPrompt = (messages: OpenpipeChatInput["messages"]) => {
  const splitter = " ";

  const userTag = "USER: ";
  const assistantTag = "ASSISTANT: ";

  let combinedSystemMessage = "";
  const conversationMessages = [];

  for (const message of messages) {
    if (message.role === "system") {
      combinedSystemMessage += message.content;
    } else if (message.role === "user") {
      conversationMessages.push(userTag + message.content);
    } else {
      conversationMessages.push(assistantTag + message.content);
    }
  }

  let systemMessage = "";

  if (combinedSystemMessage) {
    // If there is no user message, add a user tag to the system message
    if (conversationMessages.find((message) => message.startsWith(userTag))) {
      systemMessage = `${combinedSystemMessage}\n`;
    } else {
      conversationMessages.unshift(userTag + combinedSystemMessage);
    }
  }

  let prompt = `${systemMessage}${conversationMessages.join(splitter)}`;

  // Ensure that the prompt ends with an assistant message
  const lastUserIndex = prompt.lastIndexOf(userTag);
  const lastAssistantIndex = prompt.lastIndexOf(assistantTag);

  if (lastUserIndex > lastAssistantIndex) {
    prompt += splitter + assistantTag;
  }

  return prompt;
};

// ### Human: your prompt here
// ### Assistant:
export const templateHumanAssistantPrompt = (messages: OpenpipeChatInput["messages"]) => {
  const splitter = "\n";

  const humanTag = "### Human: ";
  const assistantTag = "### Assistant: ";

  const formattedMessages = messages.map((message) => {
    if (message.role === "system" || message.role === "user") {
      return humanTag + message.content;
    } else {
      return assistantTag + message.content;
    }
  });

  let prompt = formattedMessages.join(splitter);

  // Ensure that the prompt ends with an assistant message
  const lastHumanIndex = prompt.lastIndexOf(humanTag);
  const lastAssistantIndex = prompt.lastIndexOf(assistantTag);
  if (lastHumanIndex > lastAssistantIndex) {
    prompt += splitter + assistantTag;
  }

  return prompt.trim();
};
