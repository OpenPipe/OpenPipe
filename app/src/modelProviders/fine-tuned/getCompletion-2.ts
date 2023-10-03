/* eslint-disable @typescript-eslint/no-unsafe-call */
import {
  type ChatCompletion,
  type ChatCompletionMessage,
  type ChatCompletionCreateParams,
} from "openai/resources/chat";
import { v4 as uuidv4 } from "uuid";
import { runInference } from "~/utils/modal";
import { pruneInputMessages } from "./getCompletion";

export async function getCompletion2(
  huggingFaceModelId: string,
  input: ChatCompletionCreateParams,
  stringsToPrune: string[],
): Promise<ChatCompletion> {
  const { messages, ...rest } = input;
  const id = uuidv4();

  const prunedInput = pruneInputMessages(messages, stringsToPrune);
  const templatedPrompt = `### Instruction:\n${prunedInput}\n### Response:\n`;

  if (!templatedPrompt) {
    throw new Error("Failed to generate prompt");
  }

  if (input.stream) {
    throw new Error("Streaming is not yet supported");
  }

  const resp = await runInference({
    model: huggingFaceModelId,
    prompt: templatedPrompt,
    max_tokens: rest.max_tokens,
    temperature: rest.temperature ?? 0,
    n: rest.n ?? 1,
  });

  return {
    id,
    object: "chat.completion",
    created: Date.now(),
    model: input.model,
    choices: resp.choices.map((choice, i) => ({
      index: i,
      message: formatAssistantMessage(choice.text.trim()),
      finish_reason: choice.finish_reason,
    })),
    usage: {
      prompt_tokens: resp.usage.prompt_tokens,
      completion_tokens: resp.usage.completion_tokens,
      total_tokens: resp.usage.prompt_tokens + resp.usage.completion_tokens,
    },
  };
}

const FUNCTION_CALL_TAG = "<function>";
const FUNCTION_ARGS_TAG = "<arguments>";

const formatAssistantMessage = (finalCompletion: string): ChatCompletionMessage => {
  const message: ChatCompletionMessage = {
    role: "assistant",
    content: null,
  };

  if (finalCompletion.trim().startsWith(FUNCTION_CALL_TAG)) {
    const functionName = finalCompletion.split(FUNCTION_CALL_TAG)[1]?.split(FUNCTION_ARGS_TAG)[0];
    const functionArgs = finalCompletion.split(FUNCTION_ARGS_TAG)[1];
    message.function_call = { name: functionName as string, arguments: functionArgs ?? "" };
  } else {
    message.content = finalCompletion;
  }
  return message;
};
