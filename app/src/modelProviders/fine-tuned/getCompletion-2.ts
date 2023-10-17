/* eslint-disable @typescript-eslint/no-unsafe-call */
import { type ChatCompletion, type ChatCompletionCreateParams } from "openai/resources/chat";
import { v4 as uuidv4 } from "uuid";
import { type FineTune } from "@prisma/client";

import { getStringsToPrune, pruneInputMessages } from "./getCompletion";
import { runInference } from "~/server/modal-rpc/clients";
import { omit } from "lodash-es";
import { deserializeChatOutput, serializeChatInput } from "./serializers";
import { getOpenaiCompletion } from "~/server/utils/openai";

export async function getCompletion2(
  fineTune: FineTune,
  input: ChatCompletionCreateParams,
): Promise<ChatCompletion> {
  const stringsToPrune = await getStringsToPrune(fineTune.id);

  const prunedMessages = pruneInputMessages(input.messages, stringsToPrune);
  const prunedInput = { messages: prunedMessages, ...omit(input, "messages") };

  if (fineTune.baseModel === "GPT_3_5_TURBO") {
    return getOpenaiCompletion(fineTune.projectId, fineTune.openaiModelId, prunedInput);
  } else {
    return getModalCompletion(fineTune, prunedInput);
  }
}

async function getModalCompletion(
  fineTune: FineTune,
  input: ChatCompletionCreateParams,
): Promise<ChatCompletion> {
  const id = uuidv4();

  const serializedInput = serializeChatInput(input, fineTune);
  const templatedPrompt = `### Instruction:\n${serializedInput}\n\n### Response:\n`;

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
