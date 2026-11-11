import { expect, test } from "vitest";

import { chatCompletionInputReqPayload } from "./shared.types";

test("chatCompletionInputReqPayload preserves OpenAI logprobs params", () => {
  const parsed = chatCompletionInputReqPayload.parse({
    model: "gpt-4",
    messages: [{ role: "user", content: "hi" }],
    logprobs: true,
    top_logprobs: 5,
    logit_bias: { "50256": -100 },
  });

  expect(parsed.logprobs).toBe(true);
  expect(parsed.top_logprobs).toBe(5);
  expect(parsed.logit_bias).toEqual({ "50256": -100 });
});
