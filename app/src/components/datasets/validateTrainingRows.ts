import { type CreateChatCompletionRequestMessage } from "openai/resources/chat";

export type TrainingRow = {
  input: CreateChatCompletionRequestMessage[];
  output?: CreateChatCompletionRequestMessage;
};

export const parseJSONL = (jsonlString: string): unknown[] =>
  jsonlString
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line) as unknown);

export const validateTrainingRows = (rows: unknown): string | null => {
  if (!Array.isArray(rows)) return "training data is not an array";
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i] as TrainingRow;
    const error = validateTrainingRow(row);
    if (error) return `row ${i}: ${error}`;
  }

  return null;
};

const validateTrainingRow = (row: TrainingRow): string | null => {
  if (!row) return "empty row";
  if (!row.input) return "missing input";

  //   Validate input
  if (!Array.isArray(row.input)) return "input is not an array";
  if ((row.input as unknown[]).some((x) => typeof x !== "object"))
    return "input contains invalid item";
  if (row.input.some((x) => !x)) return "input contains empty item";
  if (row.input.some((x) => !x.content && !x.function_call))
    return "input contains item with no content or function_call";
  if (row.input.some((x) => x.function_call && !x.function_call.arguments))
    return "input contains item with function_call but no arguments";
  if (row.input.some((x) => x.function_call && !x.function_call.name))
    return "input contains item with function_call but no name";

  //   Validate output
  if (row.output !== undefined) {
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
