import { expect, test } from "vitest";
import parseConstructFn from "./parseConstructFn";
import assert from "assert";

// Note: this has to be run with `vitest --no-threads` option or else
// isolated-vm seems to throw errors
test("parseConstructFn", async () => {
  const constructed = await parseConstructFn(
    `
    // These sometimes have a comment

    definePrompt("openai/ChatCompletion", {
      model: "gpt-3.5-turbo-0613",
      messages: [
        {
          role: "user",
          content: \`What is the capital of \${scenario.country}?\`
        }
      ]
    })
    `,
    { country: "Bolivia" },
  );

  expect(constructed).toEqual({
    modelProvider: "openai/ChatCompletion",
    model: "gpt-3.5-turbo-0613",
    modelInput: {
      messages: [
        {
          content: "What is the capital of Bolivia?",
          role: "user",
        },
      ],
      model: "gpt-3.5-turbo-0613",
    },
  });
});

test("bad syntax", async () => {
  const parsed = await parseConstructFn(`definePrompt("openai/ChatCompletion", {`);

  assert("error" in parsed);
  expect(parsed.error).toContain("Unexpected end of input");
});
