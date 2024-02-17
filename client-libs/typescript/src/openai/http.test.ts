import { test, expect } from "vitest";
import { OPENPIPE_BASE_URL, OPENPIPE_API_KEY } from "../testConfig";
import { ReadableStream } from "node:stream/web";

const OPENPIPE_API_CHAT_COMPLETIONS_URL = OPENPIPE_BASE_URL + "chat/completions";

test("fetches non-streamed output", async () => {
  const response = await fetch(OPENPIPE_API_CHAT_COMPLETIONS_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENPIPE_API_KEY}`,
    },
    body: JSON.stringify({
      model: "openpipe:mix8",
      messages: [{ role: "user", content: "Count to 7" }],
    }),
  });

  const data = await response.json();
  console.log(data);
  expect(data.choices[0].message.content).toBeDefined();
}, 200000);

test.only("fetches streamed output", async () => {
  const response = await fetch(OPENPIPE_API_CHAT_COMPLETIONS_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENPIPE_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: "Count to 10" }],
      stream: true,
    }),
  });

  if (!response.body) {
    throw new Error("The response does not contain a readable stream.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let chunkCount = 0;

  async function processStream() {
    let done, value;
    while (true) {
      ({ done, value } = await reader.read());
      if (done) break;
      chunkCount++;

      let chunkText = decoder.decode(value, { stream: true }).trim();
      // Process each potentially concatenated chunk by splitting on the "data: " prefix
      const splitChunks = chunkText.split(/\ndata: /);
      splitChunks.forEach((splitChunk, index) => {
        console.log(chunkText);

        // For the first chunk only, remove "data: " if it's at the very start of the text
        if (index === 0 && splitChunk.startsWith("data: ")) {
          splitChunk = splitChunk.substring(5);
        }

        const chunkJson = JSON.parse(splitChunk);
        expect(chunkJson).toHaveProperty("id");
        expect(chunkJson.object).toEqual("chat.completion.chunk");
        expect(chunkJson).toHaveProperty("created");
        expect(chunkJson).toHaveProperty("model");
        expect(chunkJson).toHaveProperty("choices");
        expect(Array.isArray(chunkJson.choices)).toBeTruthy();
        chunkJson.choices.forEach((choice: Record<string, any>[]) => {
          expect(choice).toHaveProperty("index");
          expect(choice).toHaveProperty("delta");
          expect(choice).toHaveProperty("logprobs");
          expect(choice).toHaveProperty("finish_reason");
        });
      });
    }
  }

  await processStream();
  expect(chunkCount).toBeGreaterThan(1);
}, 200000);

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
