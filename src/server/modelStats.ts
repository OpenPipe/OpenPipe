import { type SupportedModel } from "./types";

interface ModelStats {
  contextLength: number;
  promptTokenPrice: number;
  completionTokenPrice: number;
  speed: "fast" | "medium" | "slow";
  provider: "OpenAI";
  learnMoreUrl: string;
}

export const modelStats: Record<SupportedModel, ModelStats> = {
  "gpt-4": {
    contextLength: 8192,
    promptTokenPrice: 0.00003,
    completionTokenPrice: 0.00006,
    speed: "medium",
    provider: "OpenAI",
    learnMoreUrl: "https://openai.com/gpt-4",
  },
  "gpt-4-0613": {
    contextLength: 8192,
    promptTokenPrice: 0.00003,
    completionTokenPrice: 0.00006,
    speed: "medium",
    provider: "OpenAI",
    learnMoreUrl: "https://openai.com/gpt-4",
  },
  "gpt-4-32k": {
    contextLength: 32768,
    promptTokenPrice: 0.00006,
    completionTokenPrice: 0.00012,
    speed: "medium",
    provider: "OpenAI",
    learnMoreUrl: "https://openai.com/gpt-4",
  },
  "gpt-4-32k-0613": {
    contextLength: 32768,
    promptTokenPrice: 0.00006,
    completionTokenPrice: 0.00012,
    speed: "medium",
    provider: "OpenAI",
    learnMoreUrl: "https://openai.com/gpt-4",
  },
  "gpt-3.5-turbo": {
    contextLength: 4096,
    promptTokenPrice: 0.0000015,
    completionTokenPrice: 0.000002,
    speed: "fast",
    provider: "OpenAI",
    learnMoreUrl: "https://platform.openai.com/docs/guides/gpt/chat-completions-api",
  },
  "gpt-3.5-turbo-0613": {
    contextLength: 4096,
    promptTokenPrice: 0.0000015,
    completionTokenPrice: 0.000002,
    speed: "fast",
    provider: "OpenAI",
    learnMoreUrl: "https://platform.openai.com/docs/guides/gpt/chat-completions-api",
  },
  "gpt-3.5-turbo-16k": {
    contextLength: 16384,
    promptTokenPrice: 0.000003,
    completionTokenPrice: 0.000004,
    speed: "fast",
    provider: "OpenAI",
    learnMoreUrl: "https://platform.openai.com/docs/guides/gpt/chat-completions-api",
  },
  "gpt-3.5-turbo-16k-0613": {
    contextLength: 16384,
    promptTokenPrice: 0.000003,
    completionTokenPrice: 0.000004,
    speed: "fast",
    provider: "OpenAI",
    learnMoreUrl: "https://platform.openai.com/docs/guides/gpt/chat-completions-api",
  },
};
