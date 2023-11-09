import type { ChatCompletionCreateParamsBase } from "openai/resources/chat/completions";

export const convertFunctionCall = (
  functionCall: ChatCompletionCreateParamsBase["function_call"] | null,
): ChatCompletionCreateParamsBase["tool_choice"] => {
  if (!functionCall) {
    return undefined;
  } else if (functionCall === "auto" || functionCall === "none") {
    return functionCall;
  } else if (functionCall.name) {
    return {
      type: "function",
      function: {
        name: functionCall.name,
      },
    };
  }
};

export const convertFunctions = (
  functions: ChatCompletionCreateParamsBase["functions"] | null,
): ChatCompletionCreateParamsBase["tools"] => {
  if (!functions) return undefined;
  return functions.map((func) => ({
    type: "function",
    function: {
      name: func.name,
      description: func.description,
      parameters: func.parameters,
    },
  }));
};

export const convertMessages = (
  messages: ChatCompletionCreateParamsBase["messages"],
): ChatCompletionCreateParamsBase["messages"] => (messages ? messages.map(convertMessage) : []);

export const convertMessage = (message: ChatCompletionCreateParamsBase["messages"][0]) => {
  switch (message.role) {
    case "system":
    case "user":
    case "tool":
      return message;
    case "assistant":
      if (message.tool_calls?.length || !message.function_call) {
        return message;
      } else {
        return {
          ...message,
          tool_calls: [
            {
              id: "",
              type: "function" as const,
              function: message.function_call,
            },
          ],
        };
      }
    case "function":
      return {
        role: "tool" as const,
        content: message.content,
        tool_call_id: "",
      };
  }
};
