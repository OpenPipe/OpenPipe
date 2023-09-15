/* eslint-disable @typescript-eslint/no-unsafe-call */
import { type ChatCompletion, type CompletionCreateParams } from "openai/resources/chat";
import { v4 as uuidv4 } from "uuid";

import { countLlamaChatTokensInMessages } from "~/utils/countTokens";

export async function getCompletion(
  input: CompletionCreateParams,
  inferenceURL: string,
): Promise<ChatCompletion> {
  const { messages, ...rest } = input;
  const id = uuidv4();

  const templatedPrompt = templatePrompt(input);

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

  let parsedCompletion;
  try {
    parsedCompletion = JSON.parse(finalCompletion);
  } catch (error: unknown) {
    throw new Error(`Failed to parse completion: ${finalCompletion}\n${(error as Error).message}`);
  }

  const promptTokens = countLlamaChatTokensInMessages(messages);
  const completionTokens = countLlamaChatTokensInMessages([
    parsedCompletion as ChatCompletion.Choice.Message,
  ]);

  return {
    id,
    object: "chat.completion",
    created: Date.now(),
    model: input.model,
    choices: [
      {
        index: 0,
        message: parsedCompletion,
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

const templatePrompt = (input: CompletionCreateParams) => {
  const { messages } = input;

  return `### Instruction:\n${JSON.stringify(messages)}\n### Response:`;
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
