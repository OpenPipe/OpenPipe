import { isObject } from "lodash-es";
import type { ChatCompletionMessageParam } from "openai/resources/chat";
import { z } from "zod";
import { chatMessage, functionCallInput, functionsInput } from "~/types/shared.types";

export const rowSchema = z.object({
  input: z.object({
    messages: z.array(chatMessage),
    function_call: functionCallInput,
    functions: functionsInput,
  }),
  output: chatMessage,
});

export type RowToImport = z.infer<typeof rowSchema>;

export type ContentChatCompletionMessage = Omit<ChatCompletionMessageParam, "function_call">;

export const parseRowsToImport = (jsonlString: string): RowToImport[] | { error: string } => {
  const lines = jsonlString.trim().split("\n");

  const parsedLines = [];

  for (let i = 0; i < lines.length; i++) {
    try {
      parsedLines.push(JSON.parse(lines[i] as string));
    } catch (e: any) {
      return { error: `Error parsing line ${i}: ${e.message as string}` };
    }
  }

  const validatedRows: RowToImport[] = [];
  for (let i = 0; i < parsedLines.length; i++) {
    const validatedRow = validateRowToImport(parsedLines[i]);
    if ("error" in validatedRow) return { error: `row ${i + 1}: ${validatedRow.error}` };
    validatedRows.push(validatedRow);
  }
  return validatedRows;
};

const validateRowToImport = (row: unknown): { error: string } | RowToImport => {
  if (!row) return { error: "empty row" };

  // Soo turns out that when you call OpenAI with Azure it doesn't return
  // `content: null` if it performs a function call. So let's manually add that if necessary
  if (
    isObject(row) &&
    "output" in row &&
    isObject(row.output) &&
    !("content" in row.output) &&
    "function_call" in row.output
  ) {
    // @ts-expect-error we're about to check this with Zod anyway
    row.output.content = null;
  }

  const parsedRow = rowSchema.safeParse(row);

  if (parsedRow.success === false) return { error: parsedRow.error.message };

  const messages = parsedRow.data.input.messages;
  //   Validate input
  if (messages.some((x) => !x.content && !x.function_call))
    return { error: "input contains item with no content or function_call" };
  if (messages.some((x) => x.function_call && !x.function_call.arguments))
    return { error: "input contains item with function_call but no arguments" };

  //   Validate output
  const output = parsedRow.data.output;
  if (output) {
    if (!output.content && !output.function_call)
      return { error: "output contains no content or function_call" };
  }

  return parsedRow.data;
};
