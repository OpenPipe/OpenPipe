import { type Evaluation, type ModelOutput, type TestScenario } from "@prisma/client";
import { type ChatCompletion } from "openai/resources/chat";
import { type VariableMap, fillTemplate } from "./fillTemplate";

export const runOneEval = (
  evaluation: Evaluation,
  scenario: TestScenario,
  modelOutput: ModelOutput,
): number => {
  const output = modelOutput.output as unknown as ChatCompletion;

  const message = output?.choices?.[0]?.message;

  if (!message) return 0;

  const stringifiedMessage = message.content ?? JSON.stringify(message.function_call);

  const matchRegex = fillTemplate(evaluation.value, scenario.variableValues as VariableMap);

  let result;

  switch (evaluation.evalType) {
    case "CONTAINS":
      result = stringifiedMessage.match(matchRegex) !== null ? 1 : 0;
      break;
    case "DOES_NOT_CONTAIN":
      result = stringifiedMessage.match(matchRegex) === null ? 1 : 0;
      break;
  }

  return result;
};
