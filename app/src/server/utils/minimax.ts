import { default as OriginalOpenAI } from "openai";
import type {
  ChatCompletion,
  ChatCompletionChunk,
  ChatCompletionCreateParams,
  ChatCompletionCreateParamsNonStreaming,
  ChatCompletionCreateParamsStreaming,
} from "openai/resources/chat";
import { type Stream } from "openai/streaming";

import { env } from "~/env.mjs";

const MINIMAX_BASE_URL = "https://api.minimax.io/v1";

/**
 * MiniMax supported models with their display names.
 */
export const MINIMAX_MODELS: Record<string, { name: string; contextWindow: number }> = {
  "MiniMax-M2.7": { name: "MiniMax-M2.7", contextWindow: 1000000 },
  "MiniMax-M2.7-highspeed": { name: "MiniMax-M2.7 Highspeed", contextWindow: 1000000 },
  "MiniMax-M2.5": { name: "MiniMax-M2.5", contextWindow: 204800 },
  "MiniMax-M2.5-highspeed": { name: "MiniMax-M2.5 Highspeed", contextWindow: 204800 },
};

/**
 * Check if a model name is a MiniMax model.
 */
export function isMiniMaxModel(model: string): boolean {
  return model.startsWith("minimax:");
}

/**
 * Extract the actual MiniMax model name from the prefixed model string.
 * e.g., "minimax:MiniMax-M2.7" -> "MiniMax-M2.7"
 */
export function extractMiniMaxModel(model: string): string {
  return model.replace("minimax:", "");
}

/**
 * Clamp temperature to MiniMax's accepted range (0, 1].
 * MiniMax does not accept temperature=0, so we clamp to a small positive value.
 */
function clampTemperature(temperature: number | null | undefined): number | undefined {
  if (temperature === null || temperature === undefined) return undefined;
  if (temperature <= 0) return 0.01;
  if (temperature > 1) return 1;
  return temperature;
}

/**
 * Strip thinking tags from MiniMax model responses.
 * MiniMax M2.5+ models may include <think>...</think> tags in responses.
 */
export function stripThinkingTags(content: string | null): string | null {
  if (!content) return content;
  return content.replace(/<think>[\s\S]*?<\/think>\s*/g, "").trim();
}

function getMiniMaxClient(): OriginalOpenAI {
  if (!env.MINIMAX_API_KEY) {
    throw new Error(
      "MINIMAX_API_KEY environment variable is required for MiniMax completions. " +
        "Get your API key at https://platform.minimaxi.com",
    );
  }

  return new OriginalOpenAI({
    baseURL: MINIMAX_BASE_URL,
    apiKey: env.MINIMAX_API_KEY,
  });
}

export async function getMiniMaxCompletion(
  input: ChatCompletionCreateParamsNonStreaming,
): Promise<ChatCompletion>;
export async function getMiniMaxCompletion(
  input: ChatCompletionCreateParamsStreaming,
): Promise<Stream<ChatCompletionChunk>>;
export async function getMiniMaxCompletion(
  input: ChatCompletionCreateParams,
): Promise<ChatCompletion | Stream<ChatCompletionChunk>>;
export async function getMiniMaxCompletion(
  input: ChatCompletionCreateParams,
): Promise<ChatCompletion | Stream<ChatCompletionChunk>> {
  const client = getMiniMaxClient();

  const modelName = extractMiniMaxModel(input.model);

  const completion = await client.chat.completions.create({
    ...input,
    model: modelName,
    temperature: clampTemperature(input.temperature),
    tools: input.tools?.length ? input.tools : undefined,
  });

  // For non-streaming responses, strip thinking tags from output
  if (!(completion instanceof Stream)) {
    for (const choice of completion.choices) {
      if (choice.message?.content) {
        choice.message.content = stripThinkingTags(choice.message.content);
      }
    }
  }

  return completion;
}
