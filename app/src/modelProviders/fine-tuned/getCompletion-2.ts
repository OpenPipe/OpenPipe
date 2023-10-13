/* eslint-disable @typescript-eslint/no-unsafe-call */
import OpenAI from "openai";
import { type ChatCompletion, type ChatCompletionCreateParams } from "openai/resources/chat";
import { v4 as uuidv4 } from "uuid";
import { type FineTune } from "@prisma/client";

import { getStringsToPrune, pruneInputMessages } from "./getCompletion";
import { prisma } from "~/server/db";
import { env } from "~/env.mjs";
import { runInference } from "~/server/modal-rpc/clients";
import { omit } from "lodash-es";
import { deserializeChatOutput, serializeChatInput } from "./utils";

export async function getCompletion2(
  fineTune: FineTune,
  input: ChatCompletionCreateParams,
): Promise<ChatCompletion> {
  const stringsToPrune = await getStringsToPrune(fineTune.id);

  const prunedMessages = pruneInputMessages(input.messages, stringsToPrune);
  const prunedInput = { messages: prunedMessages, ...omit(input, "messages") };

  if (fineTune.baseModel === "GPT_3_5_TURBO" || true) {
    return getOpenaiCompletion(fineTune, prunedInput);
  } else {
    return getModalCompletion(fineTune, prunedInput);
  }
}

async function getOpenaiCompletion(
  fineTune: FineTune,
  input: ChatCompletionCreateParams,
): Promise<ChatCompletion> {
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

  const resp = await openai.chat.completions.create({
    ...input,
    model: fineTune.openaiModelId,
    stream: false,
  });

  return {
    ...resp,
    model: input.model,
  };
}

async function getModalCompletion(
  fineTune: FineTune,
  input: ChatCompletionCreateParams,
): Promise<ChatCompletion> {
  const id = uuidv4();

  const serializedInput = serializeChatInput(input, fineTune);
  const templatedPrompt = `### Instruction:\n${serializedInput}\n### Response:\n`;

  if (input.stream) {
    throw new Error("Streaming is not yet supported");
  }

  if (!fineTune.huggingFaceModelId) {
    throw new Error("Model is not set up for inference");
  }

  const resp = await runInference({
    model: fineTune.huggingFaceModelId,
    prompt: templatedPrompt,
    max_tokens: input.max_tokens,
    temperature: input.temperature ?? 0,
    n: input.n ?? 1,
  });

  return {
    id,
    object: "chat.completion",
    created: Date.now(),
    model: input.model,
    choices: resp.choices.map((choice, i) => ({
      index: i,
      message: deserializeChatOutput(choice.text.trim()),
      finish_reason: choice.finish_reason,
    })),
    usage: {
      prompt_tokens: resp.usage.prompt_tokens,
      completion_tokens: resp.usage.completion_tokens,
      total_tokens: resp.usage.prompt_tokens + resp.usage.completion_tokens,
    },
  };
}
