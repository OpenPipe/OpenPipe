import { expect, it } from "vitest";
import { type ChatCompletionMessageParam } from "openai/resources/chat";
import { calculateEntryScore } from "./calculateEntryScore";

const originalMatchingArgs: ChatCompletionMessageParam = {
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

const generatedMatchingArgs: ChatCompletionMessageParam = {
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
  const score = calculateEntryScore(
    { messages: [], output: originalMatchingArgs },
    generatedMatchingArgs,
  );

  expect(score).toBe(1);
});

it("calculates 0 for mismatching names", () => {
  const score = calculateEntryScore(
    { messages: [], output: originalMismatchingNames },
    generatedMismatchingNames,
  );

  expect(score).toBe(0);
});

it("calculates 0 for no matching args", () => {
  const score = calculateEntryScore(
    { messages: [], output: originalMismatchingArgs },
    generatedMismatchingArgs,
  );

  expect(score).toBe(0);
});
