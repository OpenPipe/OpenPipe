import type { ChatCompletionCreateParamsBase } from "openai/resources/chat/completions";

export const convertFunctionCallToToolChoice = (
  functionCall: ChatCompletionCreateParamsBase["function_call"] | null,
): ChatCompletionCreateParamsBase["tool_choice"] | null => {
  if (!functionCall || functionCall === "auto" || functionCall === "none") {
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

export const convertToolChoiceToFunctionCall = (
  toolChoice: ChatCompletionCreateParamsBase["tool_choice"],
): ChatCompletionCreateParamsBase["function_call"] => {
  if (!toolChoice || toolChoice === "auto" || toolChoice === "none") {
    return toolChoice;
  } else if (toolChoice.type === "function" && toolChoice.function) {
    return {
      name: toolChoice.function.name,
    };
  }
};

export const convertFunctionsToTools = (
  functions: ChatCompletionCreateParamsBase["functions"],
): ChatCompletionCreateParamsBase["tools"] =>
  functions?.map((func) => ({
    type: "function",
    function: {
      name: func.name,
      description: func.description,
      parameters: func.parameters,
    },
  }));

export const convertToolsToFunctions = (
  tools: ChatCompletionCreateParamsBase["tools"],
): ChatCompletionCreateParamsBase["functions"] => {
  if (!tools?.length) return undefined;
  return tools.map((tool) => ({
    name: tool.function.name,
    description: tool.function.description,
    parameters: tool.function.parameters,
  }));
};

export const convertToolCallInputToFunctionInput = (
  input: ChatCompletionCreateParamsBase,
): ChatCompletionCreateParamsBase => {
  const functions = input.functions?.length
    ? input.functions
    : convertToolsToFunctions(input.tools);
  let function_call = undefined;
  if (input.function_call) {
    function_call = input.function_call;
  } else if (functions?.length) {
    function_call = convertToolChoiceToFunctionCall(input.tool_choice);
  }
  return {
    ...input,
    messages: convertToolCallMessagesToFunction(input.messages),
    function_call,
    functions,
    tool_choice: undefined,
    tools: undefined,
  };
};

export const convertFunctionMessagesToToolCall = (
  messages: ChatCompletionCreateParamsBase["messages"],
): ChatCompletionCreateParamsBase["messages"] => messages.map(convertFunctionMessageToToolCall);

export const convertFunctionMessageToToolCall = (
  message: ChatCompletionCreateParamsBase["messages"][0],
) => {
  switch (message.role) {
    case "system":
    case "user":
    case "tool":
      return message;
    case "assistant":
      let tool_calls = message.tool_calls;
      if (!tool_calls && message.function_call) {
        tool_calls = [
          {
            id: "",
            type: "function" as const,
            function: message.function_call,
          },
        ];
      }
      return {
        ...message,
        tool_calls,
        function_call: undefined,
      };
    case "function":
      return {
        role: "tool" as const,
        content: message.content ?? "",
        tool_call_id: message.name,
      };
  }
};

export const convertToolCallMessagesToFunction = (
  messages: ChatCompletionCreateParamsBase["messages"],
): ChatCompletionCreateParamsBase["messages"] => messages.map(convertToolCallMessageToFunction);

export const convertToolCallMessageToFunction = (
  message: ChatCompletionCreateParamsBase["messages"][0],
) => {
  switch (message.role) {
    case "system":
    case "user":
    case "function":
      return message;
    case "assistant":
      return {
        ...message,
        function_call: message.function_call || message.tool_calls?.[0]?.function,
        tool_calls: undefined,
      };
    case "tool":
      return {
        role: "function" as const,
        content: message.content,
        name: message.tool_call_id,
      };
  }
};
