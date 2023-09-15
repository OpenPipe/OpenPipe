import "dotenv/config";
import { it } from "vitest";
import { getCompletion } from "./getCompletion";
import { type CompletionCreateParams } from "openai/resources/chat";

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

  const completion = await getCompletion(inputData, endpoint);
  console.log(completion.choices[0]?.message?.content);
});
