/* eslint-disable @typescript-eslint/no-unsafe-call */
import { type ChatCompletion, type CompletionCreateParams } from "openai/resources/chat";
import { v4 as uuidv4 } from "uuid";

import { countLlamaChatTokens, countLlamaChatTokensInMessages } from "~/utils/countTokens";
import { escapeString } from "~/utils/pruningRules";

export async function getCompletion(
  input: CompletionCreateParams,
  inferenceURL: string,
  stringsToPrune: string[],
): Promise<ChatCompletion> {
  const { messages, ...rest } = input;
  const id = uuidv4();

  const templatedPrompt = templatePrompt(input, stringsToPrune);

  if (!templatedPrompt) {
    throw new Error("Failed to generate prompt");
  }

  const completionParams = {
    prompt: templatedPrompt,
    max_tokens: rest.max_tokens ?? 4096,
    temperature: rest.temperature ?? 0,
  };

  if (rest.n && rest.n > 1) {
    throw new Error("Multiple completions are not yet supported");
  }

  if (input.stream) {
    throw new Error("Streaming is not yet supported");
  }

  let resp;
  try {
    resp = await fetch(inferenceURL, {
      body: JSON.stringify(completionParams),
      method: "POST",
    });
  } catch (e) {
    throw new Error("Failed to query the model");
  }
  const respText = (await resp.json()) as { text: [string, ...string[]] };

  const finalCompletion = respText.text[0].split("### Response:")[1]?.trim();

  if (!finalCompletion) {
    throw new Error(`Unexpected response format from model: ${JSON.stringify(respText)}`);
  }

  const promptTokens = countLlamaChatTokensInMessages(messages);
  const completionTokens = countLlamaChatTokens(finalCompletion);

  const completionMessage = parseCompletionMessage(finalCompletion);

  return {
    id,
    object: "chat.completion",
    created: Date.now(),
    model: input.model,
    choices: [
      {
        index: 0,
        message: completionMessage,
        finish_reason: "stop",
      },
    ],
    usage: {
      prompt_tokens: promptTokens,
      completion_tokens: completionTokens,
      total_tokens: promptTokens + completionTokens,
    },
  };
}

export const templatePrompt = (input: CompletionCreateParams, stringsToPrune: string[]) => {
  const { messages } = input;

  let stringifedMessages = JSON.stringify(messages);
  for (const stringToPrune of stringsToPrune) {
    stringifedMessages = stringifedMessages.replaceAll(escapeString(stringToPrune), "");
  }

  return `### Instruction:\n${stringifedMessages}\n### Response:`;
};

const FUNCTION_CALL_TAG = "<|function_call|>";
const FUNCTION_ARGS_TAG = "<|function_args|>";

const parseCompletionMessage = (finalCompletion: string): ChatCompletion.Choice.Message => {
  const message: ChatCompletion.Choice.Message = {
    role: "assistant",
  };
  if (finalCompletion.includes(FUNCTION_CALL_TAG)) {
    const functionName = finalCompletion.split(FUNCTION_CALL_TAG)[1]?.split(FUNCTION_ARGS_TAG)[0];
    const functionArgs = finalCompletion.split(FUNCTION_ARGS_TAG)[1];
    message.function_call = { name: functionName, arguments: functionArgs };
  } else {
    message.content = finalCompletion;
  }
  return message;
};

// const STARTING_TEXT = '{"role":"assistant","content":"';

// const deriveChoice = (finalCompletion: string, part: OpenAI.Completions.Completion) => {
//   const choice: OpenAI.Chat.Completions.ChatCompletionChunk.Choice = {
//     index: 0,
//     delta: {},
//     finish_reason: null,
//   };
//   const newText = part.choices[0]?.text;
//   const combinedOutput = finalCompletion + (newText ?? "");
//   const alreadyContainedStartingText = finalCompletion.includes(STARTING_TEXT);
//   const containsStartingText = combinedOutput.includes(STARTING_TEXT);

//   if (!alreadyContainedStartingText && containsStartingText) {
//     choice["delta"]["role"] = "assistant";
//   }

//   if (containsStartingText && newText) {
//     choice["delta"]["content"] = newText;
//   }

//   return choice;
// };
