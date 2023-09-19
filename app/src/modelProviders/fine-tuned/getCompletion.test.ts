import "dotenv/config";
import { it, expect } from "vitest";
import { getCompletion, templatePrompt } from "./getCompletion";
import { type CompletionCreateParams } from "openai/resources/chat";
import { escapeString } from "~/utils/pruningRules";

it("gets a reasonable completion", async () => {
  const endpoint = process.env.GET_COMPLETION_TEST_ENDPOINT;

  if (!endpoint) {
    throw new Error("Missing GET_COMPLETION_TEST_ENDPOINT");
  }

  const inputData: CompletionCreateParams = {
    model: "test-model",
    messages: [
      {
        role: "system",
        content: "San Francisco is a small",
      },
    ],
  };

  const completion = await getCompletion(inputData, [endpoint], []);
  console.log(completion.choices[0]?.message?.content);
});

it("correctly templates the prompt", () => {
  const input: CompletionCreateParams = {
    model: "test-model",
    messages: [
      {
        role: "user",
        content:
          'Prompt constructor function:\n---\n/**\n * Use Javascript to define an OpenAI chat completion\n * (https://platform.openai.com/docs/api-reference/chat/create).\n *\n * You have access to the current scenario in the `scenario`\n * variable.\n */\n\ndefinePrompt("openai/ChatCompletion", {\n  model: "gpt-3.5-turbo-0613",\n  messages: [\n    {\n      role: "system",\n      content: `Write \'Start experimenting!\' in ${scenario.language}`,\n    },\n  ],\n});',
      },
    ],
  };

  const stringsToPrune = [
    "Prompt constructor function:\n---\n/**\n * Use Javascript to define an OpenAI chat completion\n *",
  ];

  if (stringsToPrune[0])
    console.log(JSON.stringify(input.messages).includes(escapeString(stringsToPrune[0])));

  const templatedPrompt = templatePrompt(input, stringsToPrune);
  console.log(templatedPrompt);
  expect(templatedPrompt.includes("Prompt constructor function")).toBe(false);
});
