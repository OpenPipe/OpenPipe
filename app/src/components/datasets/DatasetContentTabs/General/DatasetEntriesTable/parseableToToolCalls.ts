import { toolCallsOutput, toolCallsOutputFunctionArguments } from "~/types/shared.types";

// Check if the str could be parsed to an array of tool calls
export const parseableToToolCalls = (str: string): boolean => {
  let parsedJSON;
  try {
    parsedJSON = JSON.parse(str);
    // Validate against the toolCallsOutput schema
    parsedJSON = toolCallsOutput.parse(parsedJSON);
  } catch {
    return false;
  }

  // Validate each function.arguments against the toolCallsOutputFunctionArguments schema
  return parsedJSON.every((toolCall) => isToolCall(toolCall.function.arguments));
};

// Check if the str could be parsed to a tool call
export const isToolCall = (functionArguments: string): boolean => {
  let parsedArgs;
  try {
    parsedArgs = JSON.parse(functionArguments);
    // Validate against the toolCallsOutputFunctionArguments schema
    toolCallsOutputFunctionArguments.parse(parsedArgs);
    return true;
  } catch {
    return false;
  }
};
