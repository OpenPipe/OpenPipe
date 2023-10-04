import { expect, it } from "vitest";
import { type ChatCompletionMessageParam } from "openai/resources/chat";
import { calculateEntryScore } from "./calculateEntryScore";

const originalOutput1: ChatCompletionMessageParam = {
  role: "assistant",
  content: null,
  function_call: {
    name: "extract_credit_card_fields",
    arguments: '{"last_payment_date": "2023-08-26"}',
  },
};

const generatedOutput1: ChatCompletionMessageParam = {
  role: "assistant",
  content: null,
  function_call: {
    name: "extract_credit_card_fields",
    arguments: '{"last_payment_date": "2023-08-26"}',
  },
};

it("calculates 1 for perfect match", () => {
  const score = calculateEntryScore(originalOutput1.function_call, generatedOutput1.function_call);

  expect(score).toBe(1);
});
