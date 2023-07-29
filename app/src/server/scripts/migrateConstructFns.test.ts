import "dotenv/config";
import dedent from "dedent";
import { expect, test } from "vitest";
import { migrate1to2 } from "./migrateConstructFns";

test("migrate1to2", () => {
  const constructFn = dedent`
  // Test comment

  prompt = {
    model: "gpt-3.5-turbo-0613",
    messages: [
      {
        role: "user",
        content: "What is the capital of China?"
      }
    ]
  }
  `;

  const migrated = migrate1to2(constructFn);
  expect(migrated).toBe(dedent`
    // Test comment
    
    definePrompt("openai/ChatCompletion", {
      model: "gpt-3.5-turbo-0613",
      messages: [
        {
          role: "user",
          content: "What is the capital of China?"
        }
      ]
    })
  `);

  // console.log(
  //   migrateConstructFn(dedent`definePrompt(
  //   "openai/ChatCompletion",
  //   {
  //     model: 'gpt-3.5-turbo-0613',
  //     messages: []
  //   }
  // )`),
  // );
});
