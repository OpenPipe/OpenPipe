/* eslint-disable @typescript-eslint/no-unsafe-call */
import type {
  ChatCompletionMessage,
  ChatCompletion,
  ChatCompletionCreateParamsNonStreaming,
  ChatCompletionCreateParamsStreaming,
  ChatCompletionCreateParams,
  ChatCompletionChunk,
} from "openai/resources/chat";
import { type Stream } from "openai/streaming";

import { omit } from "lodash-es";
import { loraInference, runInference } from "~/server/modal-rpc/clients";
import { getOpenaiCompletion } from "~/server/utils/openai";
import { getStringsToPrune, pruneInputMessages } from "~/utils/pruningRules";
import { deserializeChatOutput, serializeChatInput } from "./serializers";
import {
  convertFunctionMessageToToolCall,
  convertToolCallInputToFunctionInput,
  convertToolCallMessageToFunction,
} from "~/server/utils/convertFunctionCalls";
import { type TypedFineTune } from "~/types/dbColumns.types";

export async function getCompletion(
  fineTune: TypedFineTune,
  input: ChatCompletionCreateParamsNonStreaming,
): Promise<ChatCompletion>;
export async function getCompletion(
  fineTune: TypedFineTune,
  input: ChatCompletionCreateParamsStreaming,
): Promise<Stream<ChatCompletionChunk>>;
export async function getCompletion(
  fineTune: TypedFineTune,
  input: ChatCompletionCreateParams,
): Promise<ChatCompletion | Stream<ChatCompletionChunk>>;
export async function getCompletion(
  fineTune: TypedFineTune,
  input: ChatCompletionCreateParams,
): Promise<ChatCompletion | Stream<ChatCompletionChunk>> {
  const stringsToPrune = await getStringsToPrune(fineTune.id);

  const prunedMessages = pruneInputMessages(input.messages, stringsToPrune);
  const prunedInput = { messages: prunedMessages, ...omit(input, "messages") };

  if (fineTune.provider === "openai") {
    return getOpenAIFineTuneCompletion(fineTune, prunedInput);
  } else {
    switch (fineTune.pipelineVersion) {
      case 1:
      case 2:
      case 3:
        return getModalCompletion(fineTune, prunedInput);
      case 0:
        throw new Error("Pipeline version 0 is not supported");
    }
  }
}

async function getOpenAIFineTuneCompletion(
  fineTune: TypedFineTune,
  input: ChatCompletionCreateParams,
): Promise<ChatCompletion | Stream<ChatCompletionChunk>> {
  const model = fineTune.openaiModelId;

  if (!model) throw new Error("No OpenAI model ID found");

  if (input.stream) {
    // Skip tool call conversion for streaming
    // Hopefully OpenAI will support tool calls for fine-tuned models soon
    const completion = await getOpenaiCompletion(fineTune.projectId, {
      ...input,
      model,
    });
    return completion;
  }

  // TODO: create pipeline without this conversion once OpenAI supports tool_calls for their fine-tuned models
  const completion = await getOpenaiCompletion(fineTune.projectId, {
    ...convertToolCallInputToFunctionInput(input),
    stream: false,
    model,
  });
  if (completion.choices[0]?.message && input.tools?.length) {
    // convert function call output to tool call output
    completion.choices[0].message = convertFunctionMessageToToolCall(
      completion.choices[0].message,
    ) as ChatCompletionMessage;
  }
  return completion;
}

async function getModalCompletion(
  fineTune: TypedFineTune,
  input: ChatCompletionCreateParams,
): Promise<ChatCompletion> {
  const serializedInput = serializeChatInput(input, fineTune);
  const templatedPrompt = `### Instruction:\n${serializedInput}\n\n### Response:\n`;

  if (input.stream) {
    throw new Error("Streaming is not yet supported");
  }

  if (!fineTune.huggingFaceModelId) {
    throw new Error("Model is not set up for inference");
  }

  let resp: Awaited<ReturnType<typeof runInference>>;
  if (fineTune.pipelineVersion < 3)
    resp = await runInference({
      model: fineTune.huggingFaceModelId,
      prompt: templatedPrompt,
      max_tokens: input.max_tokens ?? undefined,
      temperature: input.temperature ?? 0,
      n: input.n ?? 1,
    });
  else if (fineTune.pipelineVersion === 3) {
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

  let choices = resp.choices.map((choice, i) => ({
    index: i,
    message: deserializeChatOutput(choice.text.trim()),
    finish_reason: choice.finish_reason,
    // TODO: Record logprobs
    logprobs: null,
  }));
  if (input.functions?.length) {
    // messages will automatically be deserialized to tool_calls, but the user might expect a function_call
    choices = choices.map((choice) => ({
      ...choice,
      message: convertToolCallMessageToFunction(choice.message) as ChatCompletionMessage,
    }));
  }

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
