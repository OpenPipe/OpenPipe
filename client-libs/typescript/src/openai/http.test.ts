import { test, expect } from "vitest";
import { OPENPIPE_API_URL, OPENPIPE_API_KEY } from "./setup";

const OPENPIPE_API_CHAT_COMPLETIONS_URL = OPENPIPE_API_URL + "chat/completions";

test("fetches non-streamed output", async () => {
  const response = await fetch(OPENPIPE_API_CHAT_COMPLETIONS_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENPIPE_API_KEY}`,
    },
    body: JSON.stringify({
      reqPayload: {
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: "Count to 7" }],
      },
    }),
  });

  const data = await response.json();
  expect(data.choices[0].message.content).toBeDefined();
});

test("bad tags", async () => {
  const response = await fetch(OPENPIPE_API_CHAT_COMPLETIONS_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENPIPE_API_KEY}`,
      "op-tags": JSON.stringify({ promptId: ["bad tags"] }),
    },
    body: JSON.stringify({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: "Count to 7" }],
    }),
  });

  const error = await response.json();
  expect(error.message).toMatch(/Failed to parse tags/);
});
