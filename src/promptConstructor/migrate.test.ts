import "dotenv/config";
import dedent from "dedent";
import { expect, test } from "vitest";
import { migrate1to2, migrate2to3 } from "./migrate";

test("migrate1to2", () => {
  const promptConstructor = dedent`
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

  const migrated = migrate1to2(promptConstructor);
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
});

test("migrate2to3", () => {
  const promptConstructor = dedent`
  // Test comment

  definePrompt("anthropic", {
    model: "claude-2.0",
    prompt: "What is the capital of China?"
  })
  `;

  const migrated = migrate2to3(promptConstructor);
  expect(migrated).toBe(dedent`
    // Test comment
    
    definePrompt("anthropic/completion", {
      model: "claude-2.0",
      prompt: "What is the capital of China?"
    })
  `);
});
