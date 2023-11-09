import { validate } from "jsonschema";
import { isObject } from "lodash-es";
import type { ChatCompletionMessageParam } from "openai/resources/chat";
import { z } from "zod";
import {
  chatCompletionMessage,
  chatMessage,
  functionCallInput,
  functionsInput,
  toolChoiceInput,
  toolsInput,
} from "~/types/shared.types";

export const rowSchema = z.object({
  input: z.object({
    messages: z.array(chatMessage),
    function_call: functionCallInput,
    functions: functionsInput,
    tool_choice: toolChoiceInput,
    tools: toolsInput,
  }),
  output: chatCompletionMessage,
  split: z.enum(["TRAIN", "TEST"]).optional(),
});

export type RowToImport = z.infer<typeof rowSchema>;

export type ParseError = { line?: number; error: string };
export type ParsedRow = ParseError | RowToImport;

export type ContentChatCompletionMessage = Omit<ChatCompletionMessageParam, "function_call">;

export const parseRowsToImport = (jsonlString: string): ParsedRow[] => {
  const lines = jsonlString.trim().split("\n");

  const parsedRows = [];

  for (let i = 0; i < lines.length; i++) {
    try {
      const parsed = JSON.parse(lines[i] as string);
      parsedRows.push({ line: i + 1, ...validateRowToImport(parsed) });
    } catch (e: any) {
      parsedRows.push({ line: i + 1, error: e.message as string });
    }
  }

  return parsedRows;
};

export const validateRowToImport = (row: unknown): ParseError | RowToImport => {
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
  if (
    messages.some(
      (x) =>
        !x.content &&
        !("function_call" in x && x.function_call) &&
        !("tool_calls" in x && x.tool_calls),
    )
  )
    return { error: "input contains item with no content, function_call, or tool_calls" };
  if (messages.some((x) => "function_call" in x && x.function_call && !x.function_call.arguments))
    return { error: "input contains item with function_call but no arguments" };

  //   Validate output
  const output = parsedRow.data.output;
  if (output) {
    if (!output.content && !output.function_call && !output.tool_calls)
      return { error: "output contains no content, function_call, or tool_calls" };
    if (
      (output.content && output.function_call) ||
      (output.content && output.tool_calls) ||
      (output.function_call && output.tool_calls)
    )
      return {
        error: "output contains more than one of the following: content|function_call|tool_calls",
      };
    if (output.function_call) {
      const err = parseFunctionCall(output.function_call, parsedRow.data.input.functions);
      if (err) return { error: `output function_call: ${err}` };
    }
    if (output.tool_calls) {
      if (!Array.isArray(output.tool_calls)) return { error: "output tool_calls is not an array" };
      for (const toolCall of output.tool_calls) {
        if (!toolCall.function)
          return { error: "output tool_calls contains item with no function" };
        const err = parseFunctionCall(toolCall.function, parsedRow.data.input.functions);
        if (err) return { error: `output tool_call function: ${err}` };
      }
    }
  }

  return parsedRow.data;
};

export const isParseError = (row: ParsedRow): row is ParseError => {
  return "error" in row;
};

export const isRowToImport = (row: ParsedRow): row is RowToImport => {
  return !isParseError(row);
};

const parseFunctionCall = (
  function_call: { name: string; arguments: string },
  functions?: {
    name: string;
    parameters: Record<string, unknown>;
    description?: string | undefined;
  }[],
) => {
  const inputFunction = functions?.find((fn) => fn.name === function_call?.name);
  if (!inputFunction) return "no matching function in input";
  if (function_call.arguments) {
    let parsedArgs;
    try {
      parsedArgs = JSON.parse(function_call.arguments);
    } catch (e) {
      return "function arguments are not valid JSON";
    }

    const validation = validate(parsedArgs, inputFunction.parameters);

    if (!validation.valid)
      return `function arguments do not match function parameters. ${validation.errors
        .map((e) => e.stack)
        .join(", ")}`;
  }
};
