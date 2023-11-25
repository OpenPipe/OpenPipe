import { expect, it } from "vitest";
import type {
  ChatCompletionAssistantMessageParam,
  ChatCompletionMessageParam,
} from "openai/resources/chat";
import { calculateFieldComparisonScore } from "./calculateFieldComparisonScore";

const originalMatchingArgs: ChatCompletionAssistantMessageParam = {
  role: "assistant",
  content: null,
  tool_calls: [
    {
      id: "first_id",
      type: "function",
      function: {
        name: "extract_credit_card_fields",
        arguments: '{"last_payment_date": "2023-08-26"}',
      },
    },
  ],
};

const generatedMatchingArgs: ChatCompletionAssistantMessageParam = {
  role: "assistant",
  content: null,
  tool_calls: [
    {
      id: "second_id",
      type: "function",
      function: {
        name: "extract_credit_card_fields",
        arguments: '{"last_payment_date": "2023-08-26"}',
      },
    },
  ],
};

const originalMismatchingArgs: ChatCompletionMessageParam = {
  role: "assistant",
  content: null,
  tool_calls: [
    {
      id: "first_id",
      type: "function",
      function: {
        name: "extract_credit_card_fields",
        arguments: '{"last_payment_date": "2023-08-26"}',
      },
    },
  ],
};

const generatedMismatchingArgs: ChatCompletionMessageParam = {
  role: "assistant",
  content: null,
  tool_calls: [
    {
      id: "second_id",
      type: "function",
      function: {
        name: "extract_credit_card_fields",
        arguments: '{"last_payment_date": "wrong_value"}',
      },
    },
  ],
};

const originalMismatchingNames: ChatCompletionMessageParam = {
  role: "assistant",
  content: null,
  tool_calls: [
    {
      id: "first_id",
      type: "function",
      function: {
        name: "extract_credit_card_fields",
        arguments: '{"last_payment_date": "2023-08-26"}',
      },
    },
  ],
};

const generatedMismatchingNames: ChatCompletionMessageParam = {
  role: "assistant",
  content: null,
  tool_calls: [
    {
      id: "second_id",
      type: "function",
      function: {
        name: "wrong_name",
        arguments: '{"last_payment_date": "2023-08-26"}',
      },
    },
  ],
};

it("calculates 1 for perfect match", () => {
  const score = calculateFieldComparisonScore(
    { messages: [], output: originalMatchingArgs },
    { output: generatedMatchingArgs },
  );

  expect(score).toBe(1);
});

it("calculates 0 for mismatching names", () => {
  const score = calculateFieldComparisonScore(
    { messages: [], output: originalMismatchingNames },
    { output: generatedMismatchingNames },
  );

  expect(score).toBe(0);
});

it("calculates 0 for no matching args", () => {
  const score = calculateFieldComparisonScore(
    { messages: [], output: originalMismatchingArgs },
    { output: generatedMismatchingArgs },
  );

  expect(score).toBe(0);
});
