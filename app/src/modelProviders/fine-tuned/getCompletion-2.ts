import { type FineTune } from "@prisma/client";
import type {
  ChatCompletionMessage,
  ChatCompletion,
  ChatCompletionCreateParams,
} from "openai/resources/chat";

import { omit } from "lodash-es";
import { runInference } from "~/server/fine-tuning/modal-rpc/clients";
import { getOpenaiCompletion } from "~/server/utils/openai";
import { getStringsToPrune, pruneInputMessages } from "~/utils/pruningRules";
import { deserializeChatOutput, serializeChatInput } from "./serializers";
import {
  convertFunctionMessageToToolCall,
  convertToolCallInputToFunctionInput,
  convertToolCallMessageToFunction,
} from "~/server/utils/convertFunctionCalls";

export async function getCompletion2(
  fineTune: FineTune,
  input: ChatCompletionCreateParams,
): Promise<ChatCompletion> {
  if (fineTune.pipelineVersion < 1 || fineTune.pipelineVersion > 2) {
    throw new Error(
      `Model was trained with pipeline version ${fineTune.pipelineVersion}, but only versions 1-2 are currently supported.`,
    );
  }

  const stringsToPrune = await getStringsToPrune(fineTune.id);

  const prunedMessages = pruneInputMessages(input.messages, stringsToPrune);
  const prunedInput = { messages: prunedMessages, ...omit(input, "messages") };

  if (fineTune.baseModel === "GPT_3_5_TURBO") {
    const model = fineTune.openaiModelId;

    if (!model) throw new Error("No OpenAI model ID found");

    // TODO: create pipeline without this conversion once OpenAI supports tool_calls for their fine-tuned models

    const completion = await getOpenaiCompletion(fineTune.projectId, {
      // convert tool call input to function call input
      ...convertToolCallInputToFunctionInput(prunedInput),
      model,
    });
    if (completion.choices[0]?.message && input.tools?.length) {
      // convert function call output to tool call output
      completion.choices[0].message = convertFunctionMessageToToolCall(
        completion.choices[0].message,
      ) as ChatCompletionMessage;
    }
    return completion;
  } else {
    return getModalCompletion(fineTune, prunedInput);
  }
}

async function getModalCompletion(
  fineTune: FineTune,
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

  const resp = await runInference({
    model: fineTune.huggingFaceModelId,
    prompt: templatedPrompt,
    max_tokens: input.max_tokens ?? undefined,
    temperature: input.temperature ?? 0,
    n: input.n ?? 1,
  });

  let choices = resp.choices.map((choice, i) => ({
    index: i,
    message: deserializeChatOutput(choice.text.trim()),
    finish_reason: choice.finish_reason,
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
    created: Date.now(),
    model: input.model,
    choices,
    usage: {
      prompt_tokens: resp.usage.prompt_tokens,
      completion_tokens: resp.usage.completion_tokens,
      total_tokens: resp.usage.prompt_tokens + resp.usage.completion_tokens,
    },
  };
}
