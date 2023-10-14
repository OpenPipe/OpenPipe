import type { ChatCompletionCreateParams, ChatCompletionMessageParam } from "openai/resources/chat";

export type TrainingRow = {
  input: Pick<ChatCompletionCreateParams, "messages" | "function_call" | "functions">;
  output?: ChatCompletionMessageParam;
};

export type ContentChatCompletionMessage = Omit<ChatCompletionMessageParam, "function_call">;
export type OpenaiTrainingRow = {
  messages: ContentChatCompletionMessage[];
};

export const parseJSONL = (jsonlString: string): unknown[] => {
  const lines = jsonlString.trim().split("\n");

  let lineNumber = 0;
  const parsedLines = [];

  try {
    for (const line of lines) {
      lineNumber++;
      parsedLines.push(JSON.parse(line));
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (e: any) {
    throw new Error(`Error parsing line ${lineNumber}: ${e.message as string}`);
  }
  return parsedLines;
};

export const validateTrainingRows = (rows: unknown): string | null => {
  if (!Array.isArray(rows)) return "training data is not an array";
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i] as TrainingRow;
    let errorMessage: string | null = null;
    try {
      errorMessage = validateTrainingRow(row);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      errorMessage = error.message;
    }
    if (errorMessage) return `row ${i + 1}: ${errorMessage}`;
  }

  return null;
};

const validateTrainingRow = (row: TrainingRow): string | null => {
  if (!row) return "empty row";
  if (!row.input) return "missing input";

  const messages = row.input.messages;
  //   Validate input
  if (!Array.isArray(messages)) return "messages are not an array";
  if ((messages as unknown[]).some((x) => typeof x !== "object"))
    return "input contains invalid item";
  if (messages.some((x) => !x)) return "input contains empty item";
  if (messages.some((x) => !x.content && !x.function_call))
    return "input contains item with no content or function_call";
  if (messages.some((x) => x.function_call && !x.function_call.arguments))
    return "input contains item with function_call but no arguments";
  if (messages.some((x) => x.function_call && !x.function_call.name))
    return "input contains item with function_call but no name";

  //   Validate output
  if (row.output) {
    if (typeof row.output !== "object") return "output is not an object";
    if (!row.output.content && !row.output.function_call)
      return "output contains no content or function_call";
    if (row.output.function_call && !row.output.function_call.arguments)
      return "output contains function_call but no arguments";
    if (row.output.function_call && !row.output.function_call.name)
      return "output contains function_call but no name";
  }

  return null;
};
