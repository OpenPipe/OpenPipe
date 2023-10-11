/* eslint-disable @typescript-eslint/no-unsafe-call */
import OpenAI from "openai";
import {
  type ChatCompletion,
  type ChatCompletionMessage,
  type ChatCompletionCreateParams,
} from "openai/resources/chat";
import { v4 as uuidv4 } from "uuid";
import { type FineTune } from "@prisma/client";

import { pruneInputMessages, pruneInputMessagesStringified } from "./getCompletion";
import { prisma } from "~/server/db";
import { env } from "~/env.mjs";
import { runInference } from "~/server/modal-rpc/clients";

export async function getCompletion2(
  fineTune: FineTune,
  input: ChatCompletionCreateParams,
  stringsToPrune: string[],
): Promise<ChatCompletion> {
  if (fineTune.baseModel === "GPT_3_5_TURBO" || true) {
    return getOpenaiCompletion(fineTune, input, stringsToPrune);
  } else {
    return getLlamaCompletion(fineTune, input, stringsToPrune);
  }
}

async function getOpenaiCompletion(
  fineTune: FineTune,
  input: ChatCompletionCreateParams,
  stringsToPrune: string[],
): Promise<ChatCompletion> {
  const { messages, ...rest } = input;

  if (!fineTune.openaiModelId) throw new Error("No OpenAI model ID found");

  const isOpenai = fineTune.baseModel === "GPT_3_5_TURBO";

  const apiKey = !isOpenai
    ? env.ANYSCALE_API_KEY
    : (
        await prisma.apiKey.findMany({
          where: { projectId: fineTune.projectId },
        })
      ).find((key) => key.provider === "OPENAI")?.apiKey;

  if (!apiKey) {
    throw new Error("No API key found");
  }

  const openai = new OpenAI({ apiKey, baseURL: isOpenai ? undefined : env.ANYSCALE_API_BASE });

  const prunedInput = pruneInputMessages(messages, stringsToPrune);

  const resp = await openai.chat.completions.create({
    ...rest,
    model: fineTune.openaiModelId,
    messages: prunedInput,
    stream: false,
  });

  return {
    ...resp,
    model: input.model,
  };
}

async function getLlamaCompletion(
  fineTune: FineTune,
  input: ChatCompletionCreateParams,
  stringsToPrune: string[],
): Promise<ChatCompletion> {
  const { messages, ...rest } = input;
  const id = uuidv4();

  const prunedInput = pruneInputMessagesStringified(messages, stringsToPrune);
  const templatedPrompt = `### Instruction:\n${prunedInput}\n### Response:\n`;

  if (!templatedPrompt) {
    throw new Error("Failed to generate prompt");
  }

  if (input.stream) {
    throw new Error("Streaming is not yet supported");
  }

  if (!fineTune.huggingFaceModelId) {
    throw new Error("Model is not set up for inference");
  }

  const resp = await runInference({
    model: fineTune.huggingFaceModelId,
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
