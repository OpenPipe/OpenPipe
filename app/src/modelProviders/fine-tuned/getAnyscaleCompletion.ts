/* eslint-disable @typescript-eslint/no-unsafe-call */
import type { ChatCompletion, ChatCompletionCreateParams } from "openai/resources/chat";

import OpenAI from "openai";
import { type TypedFineTune } from "~/types/dbColumns.types";
import { deserializeChatOutput, serializeChatInput } from "./serializers";
import { env } from "~/env.mjs";
import { pick } from "lodash-es";

const client = env.ANYSCALE_INFERENCE_BASE_URL
  ? new OpenAI({
      baseURL: env.ANYSCALE_INFERENCE_BASE_URL,
      apiKey: env.ANYSCALE_INFERENCE_API_KEY,
    })
  : null;

export async function getAnyscaleCompletion(
  fineTune: TypedFineTune,
  input: ChatCompletionCreateParams,
): Promise<ChatCompletion> {
  if (!client) {
    throw new Error("Not configured for Anyscale inference");
  }

  if (fineTune.pipelineVersion < 3) {
    throw new Error(
      `Error: completion mismatch. This function is only supported for models with pipeline version 3+ Model: ${fineTune.slug}. Pipeline ${fineTune.pipelineVersion}`,
    );
  }

  const serializedInput = serializeChatInput(input, fineTune);
  const templatedPrompt = `### Instruction:\n${serializedInput}\n\n### Response:\n`;

  if (input.stream) {
    throw new Error("Streaming is not yet supported");
  }

  const resp = await client.chat.completions.create({
    model: `${fineTune.baseModel}:${fineTune.id}:1`,
    messages: [{ role: "system", content: templatedPrompt }],
    temperature: input.temperature ?? 0,
    n: input.n ?? 1,
    max_tokens: input.max_tokens ?? undefined,
  });

  const convertToFunctions = (input.functions?.length ?? 0) > 0;

  const choices = resp.choices.map((choice) => ({
    ...choice,
    message: deserializeChatOutput(choice.message.content?.trim() ?? "", convertToFunctions),
  }));

  if (!resp.usage) {
    throw new Error("No usage data returned");
  }

  return {
    object: "chat.completion",
    model: `openpipe:${fineTune.slug}`,
    choices,
    ...pick(resp, ["id", "created", "usage"]),
  };
}
