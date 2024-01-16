import { describe, expect, it } from "vitest";
import type {
  ChatCompletionAssistantMessageParam,
  ChatCompletionMessageParam,
  ChatCompletionCreateParamsBase,
  ChatCompletionMessage,
} from "openai/resources/chat/completions";

import { deserializeChatOutput, serializeChatInput, serializeChatOutput } from "./serializers";

const messages: ChatCompletionMessageParam[] = [
  {
    role: "system",
    content: "This is the system message.",
  },
  {
    role: "user",
    content: "This is the user message.",
  },
];

const functionBody1 = {
  name: "extract_data",
  parameters: {
    type: "object",
    properties: {
      property1: {
        type: "string",
        description: "This is the first property",
      },
      property2: {
        type: "number",
        description: "This is the second property",
      },
    },
  },
  description: "This should be omitted",
};

const functionBody2 = {
  name: "extract_data2",
  parameters: {
    type: "object",
    properties: {
      property21: {
        type: "string",
        description: "This is the first property",
      },
    },
  },
  description: "This should be omitted",
};

const baseInput: ChatCompletionCreateParamsBase = {
  model: "test",
  messages: messages,
};

const toolCallsInput1: ChatCompletionCreateParamsBase = {
  ...baseInput,
  tools: [
    {
      function: functionBody1,
      type: "function",
    },
  ],
  tool_choice: { type: "function", function: { name: functionBody1.name } },
};
const functionInput1: ChatCompletionCreateParamsBase = {
  ...baseInput,
  functions: [functionBody1],
  function_call: { name: functionBody1.name },
};

const serializedInput1Pipeline1 = `[{"role":"system","content":"This is the system message."},{"role":"user","content":"This is the user message."}]`;
const serializedInput1Pipeline2 = `{"messages":[{"role":"system","content":"This is the system message."},{"role":"user","content":"This is the user message."}],"functions":["extract_data"]}`;

const toolCallsInput2: ChatCompletionCreateParamsBase = {
  ...baseInput,
  tools: [
    {
      function: functionBody1,
      type: "function",
    },
    {
      function: functionBody2,
      type: "function",
    },
  ],
};

const serializedInput2Pipeline1 = `[{"role":"system","content":"This is the system message."},{"role":"user","content":"This is the user message."}]`;
const serializedInput2Pipeline2 = `{"messages":[{"role":"system","content":"This is the system message."},{"role":"user","content":"This is the user message."}],"functions":["extract_data","extract_data2"]}`;

const functionOutputBody1: ChatCompletionAssistantMessageParam.FunctionCall = {
  name: "extract_data",
  arguments: '{"property1": "2023-08-26", "property2": 5}',
};

const functionOutputBody2: ChatCompletionAssistantMessageParam.FunctionCall = {
  name: "extract_data2",
  arguments: '{"property21": "2023-08-26"}',
};

const noToolCallsOutputMessage: ChatCompletionMessage = {
  role: "assistant",
  content: "This is the assistant message.",
};

const noToolCallsSerializedOutput = `This is the assistant message.`;

const singleToolCallOutputMessage: ChatCompletionMessage = {
  role: "assistant",
  content: null,
  tool_calls: [
    {
      id: "",
      type: "function",
      function: functionOutputBody1,
    },
  ],
};

const singleToolCallSerializedOutput = `<function>extract_data<arguments>{"property1": "2023-08-26", "property2": 5}`;

const multipleToolCallsOutputMessage: ChatCompletionMessage = {
  role: "assistant",
  content: null,
  tool_calls: [
    {
      id: "",
      type: "function",
      function: functionOutputBody1,
    },
    {
      id: "",
      type: "function",
      function: functionOutputBody2,
    },
  ],
};

const multipleToolCallsSerializedOutput = `<function>extract_data<arguments>{"property1": "2023-08-26", "property2": 5}<function>extract_data2<arguments>{"property21": "2023-08-26"}`;

describe("serializeChatInput", () => {
  it("correctly serializes tools input with pipeline 1", () => {
    const serializedToolsInput = serializeChatInput(toolCallsInput1, { pipelineVersion: 1 });

    expect(serializedToolsInput).toBe(serializedInput1Pipeline1);
  });

  it("correctly serializes tools input with pipeline 2", () => {
    const serializedToolsInput = serializeChatInput(toolCallsInput1, { pipelineVersion: 2 });

    expect(serializedToolsInput).toBe(serializedInput1Pipeline2);
  });

  it("correctly serializes function input with pipeline 1", () => {
    const serializedFunctionInput = serializeChatInput(functionInput1, { pipelineVersion: 1 });

    expect(serializedFunctionInput).toBe(serializedInput1Pipeline1);
  });

  it("correctly serializes function input with pipeline 2", () => {
    const serializedFunctionInput = serializeChatInput(functionInput1, { pipelineVersion: 2 });

    expect(serializedFunctionInput).toBe(serializedInput1Pipeline2);
  });

  it("correctly serializes input with multiple tools pipeline 1", () => {
    const serializedToolsInput = serializeChatInput(toolCallsInput2, { pipelineVersion: 1 });

    expect(serializedToolsInput).toBe(serializedInput2Pipeline1);
  });

  it("correctly serializes input with multiple tools pipeline 2", () => {
    const serializedToolsInput = serializeChatInput(toolCallsInput2, { pipelineVersion: 2 });

    expect(serializedToolsInput).toBe(serializedInput2Pipeline2);
  });
});

describe("serializeChatOutput", () => {
  it("correctly serializes output message with no tool calls", () => {
    const serializedOutputMessage = serializeChatOutput(noToolCallsOutputMessage);

    expect(serializedOutputMessage).toBe(noToolCallsSerializedOutput);
  });

  it("correctly serializes output message with single tool call", () => {
    const serializedOutputMessage = serializeChatOutput(singleToolCallOutputMessage);

    expect(serializedOutputMessage).toBe(singleToolCallSerializedOutput);
  });

  it("correctly serializes output message with multiple tool calls", () => {
    const serializedOutputMessage = serializeChatOutput(multipleToolCallsOutputMessage);

    expect(serializedOutputMessage).toBe(multipleToolCallsSerializedOutput);
  });
});

describe("deserializeChatOutput", () => {
  it("correctly deserializes output message with no tool calls", () => {
    const deserializedOutputMessage = deserializeChatOutput(noToolCallsSerializedOutput);

    expect(deserializedOutputMessage.content).toBe(noToolCallsOutputMessage.content);
    expect(deserializedOutputMessage.role).toBe(noToolCallsOutputMessage.role);
    expect(deserializedOutputMessage.tool_calls).toStrictEqual(noToolCallsOutputMessage.tool_calls);
  });

  it("correctly deserializes output message with single tool call", () => {
    const deserializedOutputMessage = deserializeChatOutput(singleToolCallSerializedOutput);

    expect(deserializedOutputMessage.content).toBe(singleToolCallOutputMessage.content);
    expect(deserializedOutputMessage.role).toBe(singleToolCallOutputMessage.role);
    expect(deserializedOutputMessage.tool_calls).toStrictEqual(
      singleToolCallOutputMessage.tool_calls,
    );
  });

  it("correctly deserializes output message with multiple tool calls", () => {
    const deserializedOutputMessage = deserializeChatOutput(multipleToolCallsSerializedOutput);

    expect(deserializedOutputMessage.content).toBe(multipleToolCallsOutputMessage.content);
    expect(deserializedOutputMessage.role).toBe(multipleToolCallsOutputMessage.role);
    expect(deserializedOutputMessage.tool_calls).toStrictEqual(
      multipleToolCallsOutputMessage.tool_calls,
    );
  });
});
