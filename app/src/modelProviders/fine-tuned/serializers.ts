import { isObject } from "lodash-es";
import { type ChatCompletionMessage, type ChatCompletionCreateParams } from "openai/resources/chat";

const FUNCTION_CALL_TAG = "<function>";
const FUNCTION_ARGS_TAG = "<arguments>";

export const serializeChatOutput = (output: ChatCompletionMessage) => {
  let formatted = "";
  if (output?.tool_calls) {
    for (const toolCall of output.tool_calls) {
      formatted += FUNCTION_CALL_TAG + toolCall.function.name;
      if (toolCall.function.arguments) {
        formatted += FUNCTION_ARGS_TAG + toolCall.function.arguments;
      }
    }
  } else {
    formatted = output?.content ?? "";
  }
  return formatted;
};

export const deserializeChatOutput = (completion: string): ChatCompletionMessage => {
  const message: ChatCompletionMessage = {
    role: "assistant",
    content: null,
  };
  if (completion.trim().startsWith(FUNCTION_CALL_TAG)) {
    let unparsedCompletion = completion;
    const toolCalls = [];

    while (unparsedCompletion.includes(FUNCTION_CALL_TAG)) {
      const functionName = completion.split(FUNCTION_CALL_TAG)[1]?.split(FUNCTION_ARGS_TAG)[0];
      const functionArgs = completion.split(FUNCTION_ARGS_TAG)[1]?.split(FUNCTION_CALL_TAG)[0];
      toolCalls.push({
        id: "",
        type: "function" as const,
        function: { name: functionName as string, arguments: functionArgs ?? "" },
      });
      unparsedCompletion = unparsedCompletion.replace(
        FUNCTION_CALL_TAG + (functionName || "") + FUNCTION_ARGS_TAG + (functionArgs || ""),
        "",
      );
    }

    message.tool_calls = toolCalls;
  } else {
    message.content = completion;
  }
  return message;
};

export const serializeChatInput = (
  input: {
    messages: ChatCompletionCreateParams["messages"];
    tool_choice?: ChatCompletionCreateParams["tool_choice"] | null;
    tools?: ChatCompletionCreateParams["tools"] | null;
  },
  fineTune: { pipelineVersion: number; id?: string },
) => {
  if (fineTune.pipelineVersion === 1) {
    return JSON.stringify(input.messages);
  } else if (fineTune.pipelineVersion === 2) {
    let functions: string[] | null = null;
    if (input.tool_choice === "none") {
      functions = null;
    } else if (
      isObject(input.tool_choice) &&
      isObject(input.tool_choice.function) &&
      "name" in input.tool_choice.function
    ) {
      functions = [input.tool_choice.function.name];
    } else if (input.tools) {
      functions = input.tools?.map((tool) => tool.function.name) ?? [];
    }
    const toSerialize = functions
      ? { messages: input.messages, functions }
      : { messages: input.messages };
    return JSON.stringify(toSerialize);
  } else {
    throw new Error(`Invalid pipeline version for finetune ${fineTune?.id ?? "unknown"}`);
  }
};
