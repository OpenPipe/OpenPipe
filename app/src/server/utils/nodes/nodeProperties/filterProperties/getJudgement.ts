import { z } from "zod";

import zodToJsonSchema from "zod-to-json-schema";

import { getOpenaiCompletion } from "../../../openai";
import { FilterOutput } from "../nodeProperties.types";
import type {
  ChatCompletionAssistantMessageParam,
  ChatCompletionCreateParams,
  ChatCompletionMessageParam,
  FunctionParameters,
} from "openai/resources";
import { captureException } from "@sentry/node";

const functionParamsSchema = z.object({
  explanation: z.string().describe("An explanation of why you chose the response you did"),
  judgement: z
    .enum([FilterOutput.Passed, FilterOutput.Failed])
    .describe("Do the input and output pass or fail the filter?"),
});

const functionParams = zodToJsonSchema(functionParamsSchema, "functionParamsSchema").definitions?.[
  "functionParamsSchema"
] as FunctionParameters;

export const getJudgement = async ({
  projectId,
  model,
  instructions,
  messages,
  output,
}: {
  projectId: string;
  model: string;
  instructions: string;
  messages: ChatCompletionMessageParam[];
  output: ChatCompletionAssistantMessageParam;
}) => {
  const judgementInput: ChatCompletionCreateParams = {
    model: model,
    messages: [
      {
        role: "system",
        content: `You are an intelligent and trustworthy judge of LLM inputs and outputs. Your duty is to filter an input/output pair based on the following instructions: \n\n${instructions}`,
      },
      {
        role: "user",
        content: `This is the input that was sent to the LLM:
          
          ${messages.map(safeSerializeMessage).join("\n\n")},
          
          This is the output that was received from the LLM:
          
          ${safeSerializeMessage(output)}`,
      },
      {
        role: "user",
        content: `Remember to filter based on the following instructions: \n\n${instructions}`,
      },
    ],
    tools: [
      {
        type: "function",
        function: {
          name: "record_judgement",
          parameters: functionParams,
        },
      },
    ],
    tool_choice: { type: "function", function: { name: "record_judgement" } },
  };

  const response = await getOpenaiCompletion(projectId, judgementInput);

  const args = response.choices[0]?.message?.tool_calls?.[0]?.function?.arguments;

  if (!args)
    throw new Error("LLM filtering failed to return arguments: " + JSON.stringify(response));

  const jsonArgs = JSON.parse(args);
  return functionParamsSchema.parse(jsonArgs);
};

// Serialize messages in a way that minimizes the risk of the LLM believing it should follow the messages' instructions
const safeSerializeMessage = (message: ChatCompletionMessageParam): string => {
  if (message.role === "system") {
    return "task instructions: " + message.content;
  } else if (message.role === "user") {
    return "user input: " + message.content.toString();
  } else if (message.role === "assistant") {
    return (
      "assistant output: " +
      (message.content?.toString() ?? "") +
      (message.tool_calls ? "\n" + message.tool_calls?.toString() : "")
    );
  } else if (message.role === "tool") {
    return "specified tool: " + message.tool_call_id + " " + message.content;
  } else if (message.role === "function") {
    return "specified function: " + message.name + " " + (message.content ?? "");
  }

  // This would only happen if a new message type is added to the OpenAI API
  captureException(
    new Error(
      "Unsupported message role: " + (message as unknown as ChatCompletionMessageParam).role,
    ),
  );
  return "message: " + JSON.stringify(message);
};
