import dotenv from "dotenv";
import { test, expect } from "vitest";
import OpenAI from "../openai";
import type { ChatCompletionCreateParams } from "openai/resources/chat/completions";
import { OPClient } from "../codegen";

dotenv.config();

const OPENAI_BASE_URL = "https://api.openai.com/v1/chat/completions";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const OPENPIPE_API_URL = "http://localhost:3000/api/v1/chat/completions";
const OPENPIPE_API_KEY = process.env.OPENPIPE_API_KEY;

test("fetches non-streamed output", async () => {
  const response = await fetch(OPENPIPE_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENPIPE_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: "Count to 7" }],
    }),
  });

  const data = await response.json();
  expect(data.choices[0].message.content).toBeDefined();
});

test("bad tags", async () => {
  const response = await fetch(OPENPIPE_API_URL, {
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
