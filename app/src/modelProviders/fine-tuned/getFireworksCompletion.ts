/* eslint-disable @typescript-eslint/no-unsafe-call */
import type {
  ChatCompletion,
  ChatCompletionChunk,
  ChatCompletionCreateParams,
  ChatCompletionCreateParamsNonStreaming,
  ChatCompletionCreateParamsStreaming,
} from "openai/resources/chat";

import { type TypedFineTune } from "~/types/dbColumns.types";
import { deserializeChatOutput, serializeChatInput } from "./serializers";
import { env } from "~/env.mjs";
import { zip } from "lodash-es";
import { type Completion } from "openai/resources";
import { Stream } from "openai/streaming";

async function* yieldChunks(reader: ReadableStreamDefaultReader): AsyncGenerator<Completion> {
  let leftover = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = leftover + new TextDecoder().decode(value as Uint8Array);
      let start = 0;
      let end = chunk.indexOf("\n");

      while (end !== -1) {
        let line = chunk.substring(start, end).trim();
        if (line === "data: [DONE]") {
          return; // Terminate the generator upon encountering the special [DONE] message
        }
        if (line.startsWith("data:")) {
          line = line.slice(5).trim(); // Remove 'data:' prefix and trim whitespace
          // Handle multi-line data concatenation
          let data = line;
          while (end !== -1 && chunk.charAt(end + 1) !== "\n") {
            start = end + 1;
            end = chunk.indexOf("\n", start);
            line = chunk.substring(start, end).trim();
            if (line.startsWith("data:")) {
              data += "\n" + line.slice(5).trim();
            }
          }
          yield JSON.parse(data);
        }
        start = end + 1;
        end = chunk.indexOf("\n", start);
      }

      leftover = chunk.substring(start);
    }
  } catch (error) {
    console.error("Error reading stream:", error);
    throw error; // Rethrow or handle as needed
  }
  if (leftover.startsWith("data:")) {
    // Handle any final data chunk that didn't end with a newline
    yield JSON.parse(leftover.slice(5).trim()) as Completion;
  }
}

export async function getFireworksCompletion(
  fineTune: TypedFineTune,
  input: ChatCompletionCreateParamsNonStreaming,
): Promise<ChatCompletion>;
export async function getFireworksCompletion(
  fineTune: TypedFineTune,
  input: ChatCompletionCreateParamsStreaming,
): Promise<Stream<ChatCompletionChunk>>;
export async function getFireworksCompletion(
  fineTune: TypedFineTune,
  input: ChatCompletionCreateParams,
): Promise<ChatCompletion | Stream<ChatCompletionChunk>>;
export async function getFireworksCompletion(
  fineTune: TypedFineTune,
  input: ChatCompletionCreateParams,
): Promise<ChatCompletion | Stream<ChatCompletionChunk>> {
  const serializedInput = serializeChatInput(input, fineTune);
  const templatedPrompt = `### Instruction:\n${serializedInput}\n\n### Response:\n`;

  if (input.stream) {
    throw new Error("Streaming is not yet supported");
  }

  if (!env.FIREWORKS_API_KEY) {
    throw new Error("FIREWORKS_API_KEY is required for Fireworks completions");
  }

  const response = await fetch(`https://api.fireworks.ai/inference/v1/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
      Authorization: `Bearer ${env.FIREWORKS_API_KEY}`,
    },
    body: JSON.stringify({
      model: `accounts/openpipe/models/${fineTune.id}`,
      n: input.n,
      prompt: templatedPrompt,
      temperature: input.temperature ?? 0,
      top_p: input.top_p ?? 0,
      max_tokens: input.max_tokens ?? 4096,
    }),
  });

  if (response.status !== 200) {
    const text = await response.text();
    throw new Error(`Fireworks API returned status ${response.status} (${text})`);
  }

  if (!response.body) {
    throw new Error("No response body");
  }

  let resp: Completion;

  // Not fully implemented actually, but saving this code since I accidentally
  // already wrote it
  if (input.stream) {
    const reader = response.body.getReader();

    const completionGenerator = yieldChunks(reader);

    resp = await completionGenerator.next().then((x) => x.value as Completion);

    for await (const chunk of completionGenerator) {
      // const reader = response.body.getReader();
      // // Use the yieldChunks generator to process and transform each chunk
      // for await (const transformedChunk of yieldChunks(reader)) {
      //   // console.log(transformedChunk);
      //   return transformedChunk as unknown as Stream<ChatCompletionChunk>;
      // }

      const mergedChoices = zip(resp.choices, chunk.choices).map(([base, delta]) => {
        if (!base || !delta || base.index !== delta.index) {
          throw new Error("Index mismatch");
        }
        return {
          ...base,
          ...delta,
          text: base.text + delta.text,
        };
      });

      resp = {
        ...chunk,
        choices: mergedChoices,
      };
    }
  } else {
    resp = await response.json();
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
    usage: resp.usage,
  };
}
