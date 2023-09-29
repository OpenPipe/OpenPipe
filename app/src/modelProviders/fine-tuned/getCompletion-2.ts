/* eslint-disable @typescript-eslint/no-unsafe-call */
import {
  type ChatCompletion,
  type ChatCompletionMessage,
  type ChatCompletionCreateParams,
} from "openai/resources/chat";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";

// Keep in sync with inference_server/api.py
type ModalInput = {
  prompt: string;
  n?: number;
  max_tokens?: number;
  temperature?: number;
};

const outputSchema = z.object({
  id: z.string(),
  choices: z.array(
    z.object({
      text: z.string(),
      finish_reason: z.enum(["stop", "length"]),
    }),
  ),
  usage: z.object({
    prompt_tokens: z.number(),
    completion_tokens: z.number(),
  }),
});

export async function getCompletion2(
  input: ChatCompletionCreateParams,
  modalDeployId: string,
  stringsToPrune: string[],
): Promise<ChatCompletion> {
  const { messages, ...rest } = input;
  const id = uuidv4();

  const formattedInput = formatInputMessages(messages, stringsToPrune);
  const templatedPrompt = `### Instruction:\n${formattedInput}\n### Response:`;

  if (!templatedPrompt) {
    throw new Error("Failed to generate prompt");
  }

  const modalInput: ModalInput = {
    prompt: templatedPrompt,
    max_tokens: rest.max_tokens,
    temperature: rest.temperature ?? 0,
    n: rest.n ?? 1,
  };

  if (input.stream) {
    throw new Error("Streaming is not yet supported");
  }

  const resp = await fetch(`https://openpipe--${modalDeployId}.modal.run`, {
    method: "POST",
    body: JSON.stringify(modalInput),
  });

  const parsedResponse = outputSchema.parse(await resp.json());

  return {
    id,
    object: "chat.completion",
    created: Date.now(),
    model: input.model,
    choices: parsedResponse.choices.map((choice, i) => ({
      index: i,
      message: formatAssistantMessage(choice.text),
      finish_reason: choice.finish_reason,
    })),
    usage: {
      prompt_tokens: parsedResponse.usage.prompt_tokens,
      completion_tokens: parsedResponse.usage.completion_tokens,
      total_tokens: parsedResponse.usage.prompt_tokens + parsedResponse.usage.completion_tokens,
    },
  };
}

export const formatInputMessages = (
  messages: ChatCompletionMessage[],
  stringsToPrune: string[],
) => {
  for (const stringToPrune of stringsToPrune) {
    for (const message of messages) {
      if (message.content) {
        message.content = message.content.replaceAll(stringToPrune, "");
      }
    }
  }
  messages = messages.filter((message) => message.content !== "" || message.function_call);
  return JSON.stringify(messages);
};

const FUNCTION_CALL_TAG = "<function>";
const FUNCTION_ARGS_TAG = "<arguments>";

const formatAssistantMessage = (finalCompletion: string): ChatCompletionMessage => {
  const message: ChatCompletionMessage = {
    role: "assistant",
    content: null,
  };
  if (finalCompletion.startsWith(FUNCTION_CALL_TAG)) {
    const functionName = finalCompletion.split(FUNCTION_CALL_TAG)[1]?.split(FUNCTION_ARGS_TAG)[0];
    const functionArgs = finalCompletion.split(FUNCTION_ARGS_TAG)[1];
    message.function_call = { name: functionName as string, arguments: functionArgs ?? "" };
  } else {
    message.content = finalCompletion;
  }
  return message;
};
