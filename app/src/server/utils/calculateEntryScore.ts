import { type ChatCompletionMessage } from "openai/resources/chat";

// If function names don't match, return 0
// If function names match and there are no args, return 1
// If function names match and there are args, return (num matching args / num args)
export const calculateEntryScore = (
  originalToolCalls: ChatCompletionMessage["tool_calls"],
  generatedToolCalls: ChatCompletionMessage["tool_calls"],
) => {
  if (!originalToolCalls || !generatedToolCalls) return 0;

  const functionCallComp: Record<
    string,
    {
      originalFunctionCall?: ChatCompletionMessage["function_call"];
      generatedFunctionCall?: ChatCompletionMessage["function_call"];
    }
  > = {};

  for (const originalToolCall of originalToolCalls) {
    functionCallComp[originalToolCall.function.name] = {
      originalFunctionCall: originalToolCall.function,
    };
  }
  for (const generatedToolCall of generatedToolCalls) {
    const key = generatedToolCall.function.name;
    if (!functionCallComp[key]) {
      functionCallComp[key] = {};
    }
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    functionCallComp[key]!.generatedFunctionCall = generatedToolCall.function;
  }
  let totalScore = 0;
  for (const comp of Object.values(functionCallComp)) {
    const { originalFunctionCall, generatedFunctionCall } = comp;
    totalScore += calculateToolCallScore(originalFunctionCall, generatedFunctionCall);
  }
  return totalScore / Object.keys(functionCallComp).length;
};

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

    const numMatchingArgs = Object.keys(parsedOriginalArgs).filter(
      (key) => parsedOriginalArgs?.[key] === parsedGeneratedArgs?.[key],
    ).length;
    return numMatchingArgs / numOriginalArgs;
  } catch (e) {
    return 0;
  }
};
