import fs from "fs";
import path from "path";
import OpenAI, { type ClientOptions } from "openpipe-dev/src/openai";
import { APIError, default as OriginalOpenAI } from "openai";
import {
  type ChatCompletionChunk,
  type ChatCompletion,
  type ChatCompletionCreateParams,
  type ChatCompletionCreateParamsStreaming,
  type ChatCompletionCreateParamsNonStreaming,
} from "openai/resources/chat";
import { type Stream } from "openai/streaming";

import { env } from "~/env.mjs";
import { prisma } from "../db";

let config: ClientOptions;

try {
  // Allow developers to override the config with a local file
  const jsonData = fs.readFileSync(
    path.join(path.dirname(import.meta.url).replace("file://", ""), "./openaiCustomConfig.json"),
    "utf8",
  );
  config = JSON.parse(jsonData.toString());
} catch (error) {
  // Set a dummy key so it doesn't fail at build time
  config = {
    apiKey: env.OPENAI_API_KEY ?? "dummy-key",
  };
}

export const openai = new OpenAI(config);

export async function getOpenaiCompletion(
  projectId: string,
  input: ChatCompletionCreateParamsNonStreaming,
): Promise<ChatCompletion>;
export async function getOpenaiCompletion(
  projectId: string,
  input: ChatCompletionCreateParamsStreaming,
): Promise<Stream<ChatCompletionChunk>>;
export async function getOpenaiCompletion(
  projectId: string,
  input: ChatCompletionCreateParams,
): Promise<ChatCompletion | Stream<ChatCompletionChunk>>;
export async function getOpenaiCompletion(
  projectId: string,
  input: ChatCompletionCreateParams,
): Promise<ChatCompletion | Stream<ChatCompletionChunk>> {
  const apiKeys = await prisma.apiKey.findMany({
    where: { projectId: projectId },
  });

  const openaiApiKey = apiKeys.find((key) => key.provider === "OPENAI")?.apiKey;

  if (!openaiApiKey) {
    throw new Error("No OpenAI API key found");
  }

  const openai = new OriginalOpenAI({ apiKey: openaiApiKey });

  return await openai.chat.completions.create(input);
}

export const azureGpt4 = new OpenAI({
  baseURL: `https://braintrustproxy.com/v1`,
  defaultHeaders: { "x-bt-org-name": "OpenPipe" },
  apiKey: env.BRAINTRUST_API_KEY,
});

// Fall back to our own Azure instance for long-running requests
export async function getAzureGpt4Completion(input: ChatCompletionCreateParams, useCache: boolean) {
  const models = ["gpt-4", "gpt-4-turbo", "gpt-4-32k"];
  let completion: ChatCompletion | undefined = undefined;
  let lastError;
  for (const model of models) {
    try {
      completion = await azureGpt4.chat.completions.create(
        {
          ...input,
          model,
          stream: false,
        },
        { headers: { "x-bt-use-cache": useCache ? "always" : "never" } },
      );
      break;
    } catch (error) {
      if (error instanceof APIError && error.status === 429) {
        // store error to throw if all models fail
        lastError = error;
        continue;
      }
      throw error;
    }
  }
  if (!completion) {
    throw lastError;
  }
  return completion;
}
