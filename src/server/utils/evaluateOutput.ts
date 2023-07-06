import { type Evaluation, type ModelOutput, type TestScenario } from "@prisma/client";
import { type ChatCompletion } from "openai/resources/chat";
import { type VariableMap, fillTemplate } from "./fillTemplate";

export const evaluateOutput = (
  modelOutput: ModelOutput,
  scenario: TestScenario,
  evaluation: Evaluation
): boolean => {
  const output = modelOutput.output as unknown as ChatCompletion;
  const message = output?.choices?.[0]?.message;

  if (!message) return false;

  const stringifiedMessage = JSON.stringify(message);

  const matchRegex = fillTemplate(evaluation.matchString, scenario.variableValues as VariableMap);

  let match;

  switch (evaluation.matchType) {
    case "CONTAINS":
      match = stringifiedMessage.match(matchRegex) !== null;
      break;
    case "DOES_NOT_CONTAIN":
      match = stringifiedMessage.match(matchRegex) === null;
      break;
  }

  return match;
};
