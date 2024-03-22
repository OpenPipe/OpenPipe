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
    .enum([FilterOutput.Match, FilterOutput.Miss])
    .describe("Does the entry match or miss the check?"),
});

const functionParams = zodToJsonSchema(functionParamsSchema, "functionParamsSchema").definitions?.[
  "functionParamsSchema"
] as FunctionParameters;

export const getJudgement = async ({
  projectId,
  model,
  instructions,
  messages,
  tool_choice,
  tools,
  response_format,
  output,
}: {
  projectId: string;
  model: string;
  instructions: string;
  messages: ChatCompletionCreateParams["messages"];
  tool_choice: ChatCompletionCreateParams["tool_choice"] | null;
  tools: ChatCompletionCreateParams["tools"] | null;
  response_format: ChatCompletionCreateParams["response_format"] | null;
  output: ChatCompletionAssistantMessageParam;
}) => {
  const judgementInput: ChatCompletionCreateParams = {
    model: model,
    messages: [
      {
        role: "system",
        content: `You are an intelligent and trustworthy judge of LLMs. Perform a check on a dataset entry based entirely on the following instructions: \n\n${instructions}`,
      },
      {
        role: "user",
        content: `This is the input that was sent to the LLM:
          
          ${messages.map(safeSerializeMessage).join("\n\n")},
          
          ${tool_choice ? `The tool choice was set to: ${JSON.stringify(tool_choice)}` : ""}

          ${tools ? `The tools were set to: ${JSON.stringify(tools)}` : ""},

          ${
            response_format
              ? `The response format was set to: ${JSON.stringify(response_format)}`
              : ""
          },

          This is the output that was received from the LLM:
          
          ${safeSerializeMessage(output)}`,
      },
      {
        role: "user",
        content: `Remember to follow these instructions: \n\n${instructions}`,
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
      (message.tool_calls ? "\n" + JSON.stringify(message.tool_calls) : "")
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
