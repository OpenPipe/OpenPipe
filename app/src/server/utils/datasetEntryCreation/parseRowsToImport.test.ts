import { describe, expect, it } from "vitest";

import { parseRowsToImport, validateRowToImport } from "./parseRowsToImport";

describe("validateRowToImport", () => {
  it("converts question/answer JSONL rows into chat rows", () => {
    const parsed = validateRowToImport({
      question: "What is the discount percentage?",
      answer: "The discount percentage is 53.33%.",
    });

    expect(parsed).toEqual({
      input: {
        messages: [{ role: "user", content: "What is the discount percentage?" }],
      },
      output: {
        role: "assistant",
        content: "The discount percentage is 53.33%.",
      },
    });
  });

  it("preserves optional system prompts and split values for question/answer rows", () => {
    const parsed = validateRowToImport({
      system: "Answer as a concise math tutor.",
      question: "What is 2 + 2?",
      answer: "4",
      split: "TEST",
    });

    expect(parsed).toEqual({
      input: {
        messages: [
          { role: "system", content: "Answer as a concise math tutor." },
          { role: "user", content: "What is 2 + 2?" },
        ],
      },
      output: {
        role: "assistant",
        content: "4",
      },
      split: "TEST",
    });
  });
});

describe("parseRowsToImport", () => {
  it("parses multiline question/answer JSONL files without messages fields", () => {
    const rows = parseRowsToImport([
      JSON.stringify({ question: "First?", answer: "First answer." }),
      JSON.stringify({ question: "Second?", answer: "Second answer." }),
    ]);

    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      line: 1,
      input: { messages: [{ role: "user", content: "First?" }] },
      output: { role: "assistant", content: "First answer." },
    });
    expect(rows[1]).toMatchObject({
      line: 2,
      input: { messages: [{ role: "user", content: "Second?" }] },
      output: { role: "assistant", content: "Second answer." },
    });
  });
});
