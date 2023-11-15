import { isEqual, mean } from "lodash-es";
import { type ChatCompletionMessage } from "openai/resources/chat";
import { type typedDatasetEntry } from "~/types/dbColumns.types";

export const calculateEntryScore = (
  datasetEntry: ReturnType<typeof typedDatasetEntry>,
  generatedMessage: ChatCompletionMessage,
) => {
  if (datasetEntry.response_format?.type === "json_object" && !datasetEntry.output?.tool_calls) {
    return calculateToolCallScore(
      { name: "content", arguments: datasetEntry.output?.content ?? "" },
      { name: "content", arguments: generatedMessage.content ?? "" },
    );
  } else if (datasetEntry.output?.tool_calls) {
    const generatedToolCalls = Object.fromEntries(
      generatedMessage.tool_calls?.map((toolCall) => [
        toolCall.function.name,
        toolCall.function.arguments,
      ]) ?? [],
    );

    const scores = datasetEntry.output?.tool_calls.map((toolCall) => {
      const generatedToolCall = generatedToolCalls[toolCall.function.name];
      if (!generatedToolCall) return 0;
      return calculateToolCallScore(toolCall.function, {
        name: toolCall.function.name,
        arguments: generatedToolCall,
      });
    });

    return mean(scores);
  } else {
    return null;
  }
};

// If function names don't match, return 0
// If function names match and there are no args, return 1
// If function names match and there are args, return (num matching args / num args)
export const calculateToolCallScore = (
  originalFunctionCall: ChatCompletionMessage["function_call"],
  generatedFunctionCall: ChatCompletionMessage["function_call"],
) => {
  // If function names don't match, return 0
  if (!originalFunctionCall || !generatedFunctionCall) return 0;
  // If neither have args, then congrats, we matched them.
  if (!originalFunctionCall.arguments && !generatedFunctionCall.arguments) return 1;
  // If one has args and the other doesn't, then they don't match.
  if (!originalFunctionCall.arguments || !generatedFunctionCall.arguments) return 0;
  let parsedOriginalArgs: Record<string, unknown> | undefined;
  try {
    parsedOriginalArgs = JSON.parse(originalFunctionCall.arguments);
  } catch (e) {
    // Original args were off, so we can't compare them
    return 1;
  }
  if (!parsedOriginalArgs) return 1;
  let parsedGeneratedArgs: Record<string, unknown> | undefined;
  try {
    parsedGeneratedArgs = JSON.parse(generatedFunctionCall.arguments);
  } catch (e) {
    return 0;
  }
  if (!parsedGeneratedArgs) return 0;
  try {
    const numOriginalArgs = Object.keys(parsedOriginalArgs).length;

    // If there are no args, then congrats, we matched them.
    if (numOriginalArgs === 0) return 1;

    const numMatchingArgs = Object.keys(parsedOriginalArgs).filter((key) =>
      isEqual(parsedOriginalArgs?.[key], parsedGeneratedArgs?.[key]),
    ).length;
    return numMatchingArgs / numOriginalArgs;
  } catch (e) {
    return 0;
  }
};
