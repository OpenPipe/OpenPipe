import { isObject } from "lodash-es";
import { type ChatCompletionMessage, type ChatCompletionCreateParams } from "openai/resources/chat";
import {
  convertFunctionCallToToolChoice,
  convertFunctionsToTools,
  convertFunctionMessagesToToolCall,
} from "~/server/utils/convertFunctionCalls";

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
      const functionName = unparsedCompletion
        .split(FUNCTION_CALL_TAG)[1]
        ?.split(FUNCTION_ARGS_TAG)[0];
      const functionArgs = unparsedCompletion
        .split(FUNCTION_ARGS_TAG)[1]
        ?.split(FUNCTION_CALL_TAG)[0];
      toolCalls.push({
        id: "",
        type: "function" as const,
        function: { name: functionName as string, arguments: functionArgs ?? "" },
      });
      const nextFunctionCallIndex = unparsedCompletion.indexOf(FUNCTION_CALL_TAG, 1);
      unparsedCompletion =
        nextFunctionCallIndex === -1 ? "" : unparsedCompletion.slice(nextFunctionCallIndex);
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
    function_call?: ChatCompletionCreateParams["function_call"] | null;
    functions?: ChatCompletionCreateParams["functions"] | null;
    tool_choice?: ChatCompletionCreateParams["tool_choice"] | null;
    tools?: ChatCompletionCreateParams["tools"] | null;
  },
  fineTune: { pipelineVersion: number; id?: string },
) => {
  const convertedMessages = convertFunctionMessagesToToolCall(input.messages);
  if (fineTune.pipelineVersion === 1) {
    return JSON.stringify(convertedMessages);
  } else if (fineTune.pipelineVersion === 2) {
    let functions: string[] | null = null;
    const toolChoice = input.tool_choice ?? convertFunctionCallToToolChoice(input.function_call);
    const tools = input.tools?.length
      ? input.tools
      : convertFunctionsToTools(input.functions ?? undefined);
    if (toolChoice === "none") {
      functions = null;
    } else if (
      isObject(toolChoice) &&
      isObject(toolChoice.function) &&
      "name" in toolChoice.function
    ) {
      functions = [toolChoice.function.name];
    } else if (tools) {
      functions = tools?.map((tool) => tool.function.name) ?? [];
    }
    const toSerialize = functions
      ? { messages: convertedMessages, functions }
      : { messages: convertedMessages };
    return JSON.stringify(toSerialize);
  } else {
    throw new Error(`Invalid pipeline version for finetune ${fineTune?.id ?? "unknown"}`);
  }
};
