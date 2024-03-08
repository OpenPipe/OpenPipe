/* eslint-disable @typescript-eslint/no-unsafe-call */
import type {
  ChatCompletion,
  ChatCompletionChunk,
  ChatCompletionCreateParams,
  ChatCompletionCreateParamsNonStreaming,
  ChatCompletionCreateParamsStreaming,
  ChatCompletionMessage,
} from "openai/resources/chat";
import { type Stream } from "openai/streaming";

import { omit } from "lodash-es";
import {
  convertFunctionMessageToToolCall,
  convertToolCallInputToFunctionInput,
} from "~/server/utils/convertFunctionCalls";
import { getAzureGpt4Completion, getOpenaiCompletion } from "~/server/utils/openai";
import { type TypedFineTune } from "~/types/dbColumns.types";
import { getStringsToPrune, pruneInputMessages } from "~/utils/pruningRules";
import { getModalCompletion } from "./getModalCompletion";
import { getAnyscaleCompletion } from "./getAnyscaleCompletion";
import { getFireworksCompletion } from "./getFireworksCompletion";
import { fireworksConfig } from "~/server/fineTuningProviders/openpipe/fireworksConfig";
import { benchmarkMModels } from "./benchmarkMModels";

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
        return getModalCompletion(fineTune, prunedInput);
      case 3:
        let completion: Promise<ChatCompletion | Stream<ChatCompletionChunk>>;
        if (fireworksConfig(fineTune) !== null) {
          completion = getFireworksCompletion(fineTune, prunedInput);
        } else if (fineTune.gpt4FallbackEnabled) {
          completion = getAzureGpt4Completion(input);
          // keep gpus hot
          void getAnyscaleCompletion(fineTune, prunedInput).catch((e) => reportError(e));
        } else if (!prunedInput.stream) {
          completion = benchmarkMModels(
            fineTune,
            prunedInput as ChatCompletionCreateParamsNonStreaming,
          );
        } else {
          completion = getAnyscaleCompletion(fineTune, prunedInput);
        }
        return completion;
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
