import { type CompletionCreateParams } from "openai/resources/chat";
import { prisma } from "../db";
import { openai } from "../utils/openai";
import { pick } from "lodash";

type AxiosError = {
  response?: {
    data?: {
      error?: {
        message?: string;
      };
    };
  };
};

function isAxiosError(error: unknown): error is AxiosError {
  if (typeof error === "object" && error !== null) {
    // Initial check
    const err = error as AxiosError;
    return err.response?.data?.error?.message !== undefined; // Check structure
  }
  return false;
}
export const autogenerateScenarioValues = async (
  experimentId: string,
): Promise<Record<string, string>> => {
  const [experiment, variables, existingScenarios, prompt] = await Promise.all([
    prisma.experiment.findUnique({
      where: {
        id: experimentId,
      },
    }),
    prisma.templateVariable.findMany({
      where: {
        experimentId,
      },
    }),
    prisma.testScenario.findMany({
      where: {
        experimentId,
        visible: true,
      },
      orderBy: {
        sortIndex: "asc",
      },
      take: 10,
    }),
    prisma.promptVariant.findFirst({
      where: {
        experimentId,
        visible: true,
      },
      orderBy: {
        sortIndex: "asc",
      },
    }),
  ]);

  if (!experiment || !(variables?.length > 0) || !prompt) return {};

  const messages: CompletionCreateParams.CreateChatCompletionRequestNonStreaming["messages"] = [
    {
      role: "system",
      content:
        "The user is testing multiple scenarios against the same prompt. Attempt to generate a new scenario that is different from the others.",
    },
  ];

  messages.push({
    role: "user",
    content: `Prompt constructor function:\n---\n${prompt.constructFn}`,
  });

  existingScenarios
    .map(
      (scenario) =>
        pick(
          scenario.variableValues,
          variables.map((variable) => variable.label),
        ) as Record<string, string>,
    )
    .filter((vals) => Object.keys(vals ?? {}).length > 0)
    .forEach((vals) => {
      messages.push({
        role: "assistant",
        content: null,
        function_call: {
          name: "add_scenario",
          arguments: JSON.stringify(vals),
        },
      });
    });

  const variableProperties = variables.reduce(
    (acc, variable) => {
      acc[variable.label] = { type: "string" };
      return acc;
    },
    {} as Record<string, { type: "string" }>,
  );

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo-0613",
      messages,
      functions: [
        {
          name: "add_scenario",
          parameters: {
            type: "object",
            properties: variableProperties,
          },
        },
      ],

      function_call: { name: "add_scenario" },
      temperature: 0.5,
    });

    const parsed = JSON.parse(
      completion.choices[0]?.message?.function_call?.arguments ?? "{}",
    ) as Record<string, string>;
    return parsed;
  } catch (e) {
    // If it's an axios error, try to get the error message
    if (isAxiosError(e)) {
      console.error(e?.response?.data?.error?.message);
    } else {
      console.error(e);
    }
    return {};
  }

  return {};
};
