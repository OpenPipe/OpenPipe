/* eslint-disable @typescript-eslint/no-unsafe-call */
import type { ChatCompletion, ChatCompletionCreateParams } from "openai/resources/chat";

import { loraInference, runInference } from "~/server/modal-rpc/clients";
import { type TypedFineTune } from "~/types/dbColumns.types";
import { deserializeChatOutput, serializeChatInput } from "./serializers";

export async function getModalCompletion(
  fineTune: TypedFineTune,
  input: ChatCompletionCreateParams,
): Promise<ChatCompletion> {
  const serializedInput = serializeChatInput(input, fineTune);
  const templatedPrompt = `### Instruction:\n${serializedInput}\n\n### Response:\n`;

  if (input.stream) {
    throw new Error("Streaming is not yet supported");
  }

  let resp: Awaited<ReturnType<typeof runInference>>;
  if (fineTune.pipelineVersion < 3) {
    if (!fineTune.huggingFaceModelId) {
      throw new Error("Model is not set up for inference");
    }

    resp = await runInference({
      model: fineTune.huggingFaceModelId,
      prompt: templatedPrompt,
      max_tokens: input.max_tokens ?? undefined,
      temperature: input.temperature ?? 0,
      n: input.n ?? 1,
    });
  } else if (fineTune.pipelineVersion === 3) {
    resp = await loraInference.default.generate({
      base_model: fineTune.baseModel,
      lora_model: fineTune.id,
      prompt: templatedPrompt,
      max_tokens: input.max_tokens ?? undefined,
      temperature: input.temperature ?? 0,
      n: input.n ?? 1,
    });
  } else {
    throw new Error("Pipeline version not supported");
  }

  const convertToFunctions = (input.functions?.length ?? 0) > 0;

  const choices = resp.choices.map((choice, i) => ({
    index: i,
    message: deserializeChatOutput(choice.text.trim(), convertToFunctions),
    finish_reason: choice.finish_reason,
    // TODO: Record logprobs
    logprobs: null,
  }));

  return {
    id: resp.id,
    object: "chat.completion",
    created: Math.round(Date.now() / 1000),
    model: input.model,
    choices,
    usage: {
      prompt_tokens: resp.usage.prompt_tokens,
      completion_tokens: resp.usage.completion_tokens,
      total_tokens: resp.usage.prompt_tokens + resp.usage.completion_tokens,
    },
  };
}
