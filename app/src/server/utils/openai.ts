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

  return await openai.chat.completions.create({
    ...input,
    tools: input.tools?.length ? input.tools : undefined,
  });
}

// Fall back to our own Azure instance for long-running requests
export async function getAzureGpt4Completion(input: ChatCompletionCreateParams) {
  const models = ["gpt-4", "gpt-4-turbo", "gpt-4-32k"] as const;
  let lastError;
  for (const model of models) {
    const client = getEndpointForModel(model).client;

    try {
      return client.chat.completions.create({
        ...input,
        model,
        stream: false,
      });
    } catch (error) {
      if (error instanceof APIError && error.status === 429) {
        // store error to throw if all models fail
        lastError = error;
        continue;
      }
      console.log("ERROR:", error);
      throw error;
    }
  }
  throw lastError;
}

const azureGpt4Endpoints: readonly {
  apiBase: string;
  apiKey: string;
  models: {
    "gpt-4"?: number;
    "gpt-4-turbo"?: number;
    "gpt-4-32k"?: number;
  };
}[] = [
  {
    apiBase: "https://openpipe-openai-eastus2.openai.azure.com",
    apiKey: env.AZURE_OPENAI_API_KEY_EASTUS2,
    models: { "gpt-4": 100, "gpt-4-32k": 80, "gpt-4-turbo": 80 },
  },
  {
    apiBase: "https://openpipe-openai.openai.azure.com",
    apiKey: env.AZURE_OPENAI_API_KEY_EASTUS,
    models: { "gpt-4": 20, "gpt-4-32k": 60 },
  },
  {
    apiBase: "https://openpipe-openai-westus.openai.azure.com",
    apiKey: env.AZURE_OPENAI_API_KEY_WESTUS,
    models: { "gpt-4-turbo": 80 },
  },
  {
    apiBase: "https://openpipe-openai-canadaeast.openai.azure.com",
    apiKey: env.AZURE_OPENAI_API_KEY_CANADAEAST,
    models: { "gpt-4": 40, "gpt-4-32k": 80, "gpt-4-turbo": 80 },
  },
  {
    apiBase: "https://openpipe-openai-australiaeast.openai.azure.com",
    apiKey: env.AZURE_OPENAI_API_KEY_AUSTRALIAEAST,
    models: { "gpt-4": 40, "gpt-4-32k": 80, "gpt-4-turbo": 80 },
  },
  {
    apiBase: "https://openpipe-openai-francecentral.openai.azure.com",
    apiKey: env.AZURE_OPENAI_API_KEY_FRANCECENTRAL,
    models: { "gpt-4": 20, "gpt-4-32k": 60, "gpt-4-turbo": 80 },
  },
  {
    apiBase: "https://openpipe-openai-japaneast.openai.azure.com",
    apiKey: env.AZURE_OPENAI_API_KEY_JAPANEAST,
    models: { "gpt-4": 40, "gpt-4-32k": 80 },
  },
  {
    apiBase: "https://openpipe-openai-norwayeast.openai.azure.com",
    apiKey: env.AZURE_OPENAI_API_KEY_NORWAYEAST,
    models: { "gpt-4-turbo": 150 },
  },
  {
    apiBase: "https://openpipe-openai-southindia.openai.azure.com",
    apiKey: env.AZURE_OPENAI_API_KEY_SOUTHINDIA,
    models: { "gpt-4-turbo": 150 },
  },
] as const;

type AzureModel = keyof (typeof azureGpt4Endpoints)[0]["models"];
type AzureModelEndpoint = {
  client: OriginalOpenAI;
  rateLimit: number;
};

const modelEndpoints: Record<AzureModel, AzureModelEndpoint[]> = {
  "gpt-4": [],
  "gpt-4-turbo": [],
  "gpt-4-32k": [],
};

for (const endpoint of azureGpt4Endpoints) {
  for (const [model, rateLimit] of Object.entries(endpoint.models)) {
    modelEndpoints[model as AzureModel].push({
      client: new OriginalOpenAI({
        baseURL: `${endpoint.apiBase}/openai/deployments/${model}/`,
        defaultQuery: { "api-version": "2023-08-01-preview" },
        defaultHeaders: { "api-key": endpoint.apiKey },
      }),
      rateLimit: rateLimit,
    });
  }
}

const getEndpointForModel = (model: AzureModel) => {
  // weight endpoints by rate limit
  const i =
    Math.random() * modelEndpoints[model].reduce((sum, endpoint) => sum + endpoint.rateLimit, 0);
  let sum = 0;
  for (const endpoint of modelEndpoints[model]) {
    sum += endpoint.rateLimit;
    if (i < sum) {
      return endpoint;
    }
  }
  throw new Error("No endpoint found");
};
