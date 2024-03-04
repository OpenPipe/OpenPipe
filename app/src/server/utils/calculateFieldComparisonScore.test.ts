import { expect, it } from "vitest";
import type { ChatCompletionMessage } from "openai/resources/chat";
import { calculateFieldComparisonScore } from "./calculateFieldComparisonScore";

const originalMatchingArgs: ChatCompletionMessage = {
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

const generatedMatchingArgs: ChatCompletionMessage = {
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

const originalMismatchingArgs: ChatCompletionMessage = {
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

const generatedMismatchingArgs: ChatCompletionMessage = {
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

const originalMismatchingNames: ChatCompletionMessage = {
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

const generatedMismatchingNames: ChatCompletionMessage = {
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
    generatedMatchingArgs,
  );

  expect(score).toBe(1);
});

it("calculates 0 for mismatching names", () => {
  const score = calculateFieldComparisonScore(
    { messages: [], output: originalMismatchingNames },
    generatedMismatchingNames,
  );

  expect(score).toBe(0);
});

it("calculates 0 for no matching args", () => {
  const score = calculateFieldComparisonScore(
    { messages: [], output: originalMismatchingArgs },
    generatedMismatchingArgs,
  );

  expect(score).toBe(0);
});
