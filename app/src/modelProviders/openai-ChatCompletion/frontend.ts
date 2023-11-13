import { type JsonValue } from "type-fest";
import { type SupportedModel } from ".";
import { type FrontendModelProvider } from "../types";
import { type ChatCompletion } from "openai/resources/chat";

const frontendModelProvider: FrontendModelProvider<SupportedModel, ChatCompletion> = {
  name: "OpenAI ChatCompletion",

  models: {
    "gpt-4-1106-preview": {
      name: "GPT-4 1106 Preview",
      contextWindow: 128000,
      promptTokenPrice: 0.00001,
      completionTokenPrice: 0.00003,
      speed: "fast",
      provider: "openai/ChatCompletion",
    },
    "gpt-4-0613": {
      name: "GPT-4",
      contextWindow: 8192,
      promptTokenPrice: 0.00003,
      completionTokenPrice: 0.00006,
      speed: "medium",
      provider: "openai/ChatCompletion",
      learnMoreUrl: "https://openai.com/gpt-4",
    },
    "gpt-4-32k-0613": {
      name: "GPT-4 32k",
      contextWindow: 32768,
      promptTokenPrice: 0.00006,
      completionTokenPrice: 0.00012,
      speed: "medium",
      provider: "openai/ChatCompletion",
      learnMoreUrl: "https://openai.com/gpt-4",
    },
    "gpt-3.5-turbo-1106": {
      name: "GPT-3.5 Turbo 1106",
      contextWindow: 16385,
      promptTokenPrice: 0.000001,
      completionTokenPrice: 0.000002,
      speed: "fast",
      provider: "openai/ChatCompletion",
    },
    "gpt-3.5-turbo-0613": {
      name: "GPT-3.5 Turbo",
      contextWindow: 4096,
      promptTokenPrice: 0.0000015,
      completionTokenPrice: 0.000002,
      speed: "fast",
      provider: "openai/ChatCompletion",
      learnMoreUrl: "https://platform.openai.com/docs/guides/gpt/chat-completions-api",
    },
    "gpt-3.5-turbo-16k-0613": {
      name: "GPT-3.5 Turbo 16k",
      contextWindow: 16384,
      promptTokenPrice: 0.000003,
      completionTokenPrice: 0.000004,
      speed: "fast",
      provider: "openai/ChatCompletion",
      learnMoreUrl: "https://platform.openai.com/docs/guides/gpt/chat-completions-api",
    },
  },

  normalizeOutput: (output) => {
    const message = output.choices[0]?.message;
    if (!message)
      return {
        type: "json",
        value: output as unknown as JsonValue,
      };

    if (message.content) {
      return {
        type: "text",
        value: message.content,
      };
    } else if (message.function_call) {
      let args = message.function_call.arguments ?? "";
      try {
        args = JSON.parse(args);
      } catch (e) {
        // Ignore
      }
      return {
        type: "json",
        value: {
          ...message.function_call,
          arguments: args,
        },
      };
    } else {
      return {
        type: "json",
        value: message as unknown as JsonValue,
      };
    }
  },
};

export default frontendModelProvider;
