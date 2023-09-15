import { isArray, isString } from "lodash-es";
import OpenAI, { APIError } from "openai";
import { v4 as uuidv4 } from "uuid";
import {
  type ChatCompletion,
  type CompletionCreateParams,
  type ChatCompletionChunk,
} from "openai/resources/chat";

import { type CompletionResponse } from "../types";
import { countLlamaChatTokensInMessages } from "~/utils/countTokens";

const ENABLE_STREAMING = false;

export async function getCompletion(
  input: CompletionCreateParams,
  onStream: ((partialOutput: ChatCompletionChunk) => void) | null,
  modelSlug: string,
  inferenceURL: string,
  stringsToPrune: string[],
): Promise<CompletionResponse<ChatCompletion>> {
  const { messages, ...rest } = input;
  const id = uuidv4();

  const templatedPrompt = templatePrompt(input, stringsToPrune);

  if (!templatedPrompt) {
    return {
      type: "error",
      message: "Failed to generate prompt",
      autoRetry: false,
    };
  }

  const openai = new OpenAI({
    baseURL: inferenceURL,
  });
  const start = Date.now();
  let finalCompletion = "";

  const completionParams = {
    prompt: templatedPrompt,
    max_tokens: 4096,
    ...rest,
  };

  try {
    if (ENABLE_STREAMING && onStream) {
      const resp = await openai.completions.create(
        { ...completionParams, stream: true },
        {
          maxRetries: 0,
        },
      );

      for await (const part of resp) {
        const choice = deriveChoice(finalCompletion, part);
        finalCompletion += part.choices[0]?.text;

        onStream({
          id,
          object: "chat.completion.chunk",
          created: Date.now(),
          model: modelSlug,
          choices: [choice],
        });
      }
      if (!finalCompletion) {
        return {
          type: "error",
          message: "Streaming failed to return a completion",
          autoRetry: false,
        };
      }
    } else {
      let resp;
      try {
        resp = await openai.completions.create(
          { ...completionParams, stream: false },
          {
            maxRetries: 0,
          },
        );
      } catch (e) {
        console.log("error querying the model", e);
        throw e;
      }
      console.log("resp", resp);
      finalCompletion = resp.choices[0]?.text || "";
      if (!finalCompletion) {
        return {
          type: "error",
          message: "Failed to return a completion",
          autoRetry: false,
        };
      }
    }
    const timeToComplete = Date.now() - start;

    let parsedCompletion;
    try {
      parsedCompletion = JSON.parse(finalCompletion);
    } catch (error: unknown) {
      return {
        type: "error",
        message: `Failed to parse completion: ${finalCompletion}\n${(error as Error).message}`,
        autoRetry: false,
      };
    }

    const promptTokens = countLlamaChatTokensInMessages(messages);
    const completionTokens = countLlamaChatTokensInMessages([
      parsedCompletion as ChatCompletion.Choice.Message,
    ]);

    return {
      type: "success",
      statusCode: 200,
      value: {
        id,
        object: "chat.completion",
        created: Date.now(),
        model: modelSlug,
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
      },
      timeToComplete,
    };
  } catch (error: unknown) {
    if (error instanceof APIError) {
      // The types from the sdk are wrong
      const rawMessage = error.message as string | string[];
      // If the message is not a string, stringify it
      const message = isString(rawMessage)
        ? rawMessage
        : isArray(rawMessage)
        ? rawMessage.map((m) => m.toString()).join("\n")
        : // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-explicit-any
          (rawMessage as any).toString();
      return {
        type: "error",
        message,
        autoRetry: error.status === 429 || error.status === 503,
        statusCode: error.status,
      };
    } else {
      console.error(error);
      return {
        type: "error",
        message: (error as Error).message,
        autoRetry: true,
      };
    }
  }
}

const templatePrompt = (input: CompletionCreateParams, stringsToPrune: string[]) => {
  const { messages } = input;

  let stringifedMessages = JSON.stringify(messages);
  for (const stringToPrune of stringsToPrune) {
    stringifedMessages = stringifedMessages.replaceAll(stringToPrune, "");
  }

  return `### Instruction:\n${stringifedMessages}\n### Response:`;
};

const STARTING_TEXT = '{"role":"assistant","content":"';

const deriveChoice = (finalCompletion: string, part: OpenAI.Completions.Completion) => {
  const choice: OpenAI.Chat.Completions.ChatCompletionChunk.Choice = {
    index: 0,
    delta: {},
    finish_reason: null,
  };
  const newText = part.choices[0]?.text;
  const combinedOutput = finalCompletion + (newText ?? "");
  const alreadyContainedStartingText = finalCompletion.includes(STARTING_TEXT);
  const containsStartingText = combinedOutput.includes(STARTING_TEXT);

  if (!alreadyContainedStartingText && containsStartingText) {
    choice["delta"]["role"] = "assistant";
  }

  if (containsStartingText && newText) {
    choice["delta"]["content"] = newText;
  }

  return choice;
};
