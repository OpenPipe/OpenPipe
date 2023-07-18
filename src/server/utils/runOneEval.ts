import { type Evaluation, type ModelOutput, type TestScenario } from "@prisma/client";
import { type ChatCompletion } from "openai/resources/chat";
import { type VariableMap, fillTemplate } from "./fillTemplate";
import { openai } from "./openai";
import dedent from "dedent";

export const runGpt4Eval = async (
  evaluation: Evaluation,
  scenario: TestScenario,
  message: ChatCompletion.Choice.Message,
): Promise<{ result: number; details: string }> => {
  const output = await openai.chat.completions.create({
    model: "gpt-4-0613",
    messages: [
      {
        role: "system",
        content: dedent`
        You are a highly intelligent AI model and have been tasked with evaluating the quality of a simpler model. Your objective is to determine whether the simpler model has produced a successful and correct output. You should return "true" if the output was successful and "false" if it was not. Pay more attention to the semantics of the output than the formatting. Success is defined in the following terms:
        ---
        ${evaluation.value}
        `,
      },
      {
        role: "user",
        content: `Scenario:\n---\n${JSON.stringify(scenario.variableValues, null, 2)}`,
      },
      {
        role: "user",
        content: `The full output of the simpler message:\n---\n${JSON.stringify(
          message.content ?? message.function_call,
          null,
          2,
        )}`,
      },
    ],
    function_call: {
      name: "report_success",
    },
    functions: [
      {
        name: "report_success",
        parameters: {
          type: "object",
          required: ["thoughts", "success"],
          properties: {
            thoughts: {
              type: "string",
              description: "Explain your reasoning for considering this a pass or fail",
            },
            success: {
              type: "boolean",
              description:
                "Whether the simpler model successfully completed the task for this scenario",
            },
          },
        },
      },
    ],
  });

  try {
    const out = JSON.parse(output.choices[0]?.message?.function_call?.arguments ?? "");
    return { result: out.success ? 1 : 0, details: out.thoughts ?? JSON.stringify(out) };
  } catch (e) {
    console.error(e);
    return { result: 0, details: "Error parsing GPT-4 output" };
  }
};

export const runOneEval = async (
  evaluation: Evaluation,
  scenario: TestScenario,
  modelOutput: ModelOutput,
): Promise<{ result: number; details?: string }> => {
  const output = modelOutput.output as unknown as ChatCompletion;

  const message = output?.choices?.[0]?.message;

  if (!message) return { result: 0 };

  const stringifiedMessage = message.content ?? JSON.stringify(message.function_call);

  const matchRegex = fillTemplate(evaluation.value, scenario.variableValues as VariableMap);

  switch (evaluation.evalType) {
    case "CONTAINS":
      return { result: stringifiedMessage.match(matchRegex) !== null ? 1 : 0 };
    case "DOES_NOT_CONTAIN":
      return { result: stringifiedMessage.match(matchRegex) === null ? 1 : 0 };
    case "GPT4_EVAL":
      return await runGpt4Eval(evaluation, scenario, message);
  }
};
