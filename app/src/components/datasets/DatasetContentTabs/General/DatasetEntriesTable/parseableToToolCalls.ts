// Check if the str could be parsed to an array of tool calls
export const parseableToToolCalls = (str: string) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let parsedJSON: any;
  try {
    parsedJSON = JSON.parse(str);
  } catch {
    return false;
  }

  // Check if the parsedJSON is an object and not null
  if (parsedJSON === null || !Array.isArray(parsedJSON)) {
    return false;
  }

  return parsedJSON.every((toolCall) => isToolCall(toolCall));
};

// Check if the str could be parsed to a tool call
export const isToolCall = (parsedJSON: any) => {
  // Check if the parsedJSON is an object and not null
  if (typeof parsedJSON !== "object" || parsedJSON === null) {
    return false;
  }

  // Check if only the keys "name" and "arguments" exist
  const keys = Object.keys(parsedJSON as Record<string, unknown>);
  if (
    keys.length !== 3 ||
    !keys.includes("id") ||
    !keys.includes("function") ||
    !keys.includes("type")
  ) {
    return false;
  }

  const functionJSON = parsedJSON.function;

  if (typeof functionJSON !== "object" || functionJSON === null) return false;

  // Check if only the keys "name" and "arguments" exist
  const functionKeys = Object.keys(functionJSON as Record<string, unknown>);
  if (
    functionKeys.length !== 2 ||
    !functionKeys.includes("name") ||
    !functionKeys.includes("arguments")
  ) {
    return false;
  }

  // Check if both "name" and "arguments" are of type string
  if (typeof functionJSON.name !== "string" || typeof functionJSON.arguments !== "string") {
    return false;
  }

  // Check if the "arguments" value is parseable to an object
  let parsedArguments: unknown;
  try {
    parsedArguments = JSON.parse(functionJSON["arguments"]);
  } catch {
    return false;
  }

  // Check if parsedArguments is an object and not null
  if (typeof parsedArguments !== "object" || parsedArguments === null) {
    return false;
  }

  return true;
};
