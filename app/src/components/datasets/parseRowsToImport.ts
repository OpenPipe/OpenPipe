import { validate } from "jsonschema";
import { isObject } from "lodash-es";
import type {
  ChatCompletionCreateParamsBase,
  ChatCompletionMessageParam,
} from "openai/resources/chat/completions";
import { z } from "zod";
import {
  chatCompletionInputReqPayload,
  chatCompletionMessage,
  chatMessage,
  functionCallInput,
  functionsInput,
  toolChoiceInput,
  toolsInput,
} from "~/types/shared.types";

const chatInputs = chatCompletionInputReqPayload.shape;

export const rowSchema = z.object({
  input: z.object({
    messages: z.array(chatMessage),
    function_call: functionCallInput,
    functions: functionsInput,
    tool_choice: toolChoiceInput,
    tools: toolsInput,
    response_format: chatInputs.response_format,
  }),
  output: chatCompletionMessage,
  split: z.enum(["TRAIN", "TEST"]).optional(),
});

export const openAIRowSchema = z.object({
  messages: z.array(chatMessage),
  function_call: functionCallInput,
  functions: functionsInput,
  tool_choice: toolChoiceInput,
  tools: toolsInput,
  response_format: chatInputs.response_format,
  split: z.enum(["TRAIN", "TEST"]).optional(),
});

export type RowToImport = z.infer<typeof rowSchema>;

export type ParseError = { line?: number; error: string };
export type ParsedRow = ParseError | RowToImport;

export type ContentChatCompletionMessage = Omit<ChatCompletionMessageParam, "function_call">;

export const parseRowsToImport = (rawRows: string[]): ParsedRow[] => {
  const lines = rawRows.map((row) => row.trim()).filter((row) => row.length > 0);

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
    ("function_call" in row.output || "tool_calls" in row.output)
  ) {
    // @ts-expect-error we're about to check this with Zod anyway
    row.output.content = null;
  }

  const parsedRowLegacyFormat = rowSchema.safeParse(row);

  if (parsedRowLegacyFormat.success) {
    const messages = [
      ...parsedRowLegacyFormat.data.input.messages,
      parsedRowLegacyFormat.data.output,
    ];
    for (const message of messages) {
      const err = parseMessage(message, parsedRowLegacyFormat.data.input.functions);
      if (err) return err;
    }
    return parsedRowLegacyFormat.data;
  }

  const parsedRow = openAIRowSchema.safeParse(row);

  if (parsedRow.success) {
    for (const message of parsedRow.data.messages) {
      const err = parseMessage(message, parsedRow.data.functions);
      if (err) return err;
    }
    const { messages, split, ...rest } = parsedRow.data;
    const output = messages.pop();
    if (!output) return { error: "messages array is empty" };
    if (output.role !== "assistant")
      return { error: "the final message must be from the assistant" };
    return {
      input: {
        ...rest,
        messages,
      },
      split,
      output,
    };
  }

  return { error: parsedRow.error.message };
};

export const isParseError = (row: ParsedRow): row is ParseError => {
  return "error" in row;
};

export const isRowToImport = (row: ParsedRow): row is RowToImport => {
  return !isParseError(row);
};

const parseMessage = (
  message: ChatCompletionMessageParam,
  functions: ChatCompletionCreateParamsBase["functions"],
) => {
  if (
    !message.content &&
    (!("function_call" in message) || !message.function_call) &&
    (!("tool_calls" in message) || !message.tool_calls)
  )
    return { error: "input contains item with no content, function_call, or tool_calls" };
  if ("function_call" in message && message.function_call && !message.function_call.arguments)
    return { error: "input contains item with function_call but no arguments" };

  if (message.role === "assistant") {
    if (!message.content && !message.function_call && !message.tool_calls)
      return { error: "message contains no content, function_call, or tool_calls" };
    if (
      (message.content && message.function_call) ||
      (message.content && message.tool_calls) ||
      (message.function_call && message.tool_calls)
    )
      return {
        error: "message contains more than one of the following: content|function_call|tool_calls",
      };
    if (message.function_call) {
      const _err = parseFunctionCall(message.function_call, functions);
      // TODO: Add error tag to dataset entry
    }
    if (message.tool_calls) {
      if (!Array.isArray(message.tool_calls))
        return { error: "message tool_calls is not an array" };
      for (const toolCall of message.tool_calls) {
        if (!toolCall.function)
          return { error: "message tool_calls contains item with no function" };
        const _err = parseFunctionCall(toolCall.function, functions);
        // TODO: Add error tag to dataset entry
      }
    }
  }
};

const parseFunctionCall = (
  function_call: { name: string; arguments: string },
  functions?: {
    name: string;
    parameters?: Record<string, unknown>;
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
