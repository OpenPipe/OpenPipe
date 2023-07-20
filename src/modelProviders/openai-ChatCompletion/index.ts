import { type JSONSchema4 } from "json-schema";
import { type ModelProvider } from "../types";
import inputSchema from "./codegen/input.schema.json";
import { type CompletionCreateParams } from "openai/resources/chat";

const supportedModels = [
  "gpt-4-0613",
  "gpt-4-32k-0613",
  "gpt-3.5-turbo-0613",
  "gpt-3.5-turbo-16k-0613",
] as const;

type SupportedModel = (typeof supportedModels)[number];

const modelProvider: ModelProvider<SupportedModel, CompletionCreateParams> = {
  name: "OpenAI ChatCompletion",
  models: {
    "gpt-4-0613": {
      name: "GPT-4",
      learnMore: "https://openai.com/gpt-4",
    },
    "gpt-4-32k-0613": {
      name: "GPT-4 32k",
      learnMore: "https://openai.com/gpt-4",
    },
    "gpt-3.5-turbo-0613": {
      name: "GPT-3.5 Turbo",
      learnMore: "https://platform.openai.com/docs/guides/gpt/chat-completions-api",
    },
    "gpt-3.5-turbo-16k-0613": {
      name: "GPT-3.5 Turbo 16k",
      learnMore: "https://platform.openai.com/docs/guides/gpt/chat-completions-api",
    },
  },
  getModel: (input) => {
    if (supportedModels.includes(input.model as SupportedModel))
      return input.model as SupportedModel;

    const modelMaps: Record<string, SupportedModel> = {
      "gpt-4": "gpt-4-0613",
      "gpt-4-32k": "gpt-4-32k-0613",
      "gpt-3.5-turbo": "gpt-3.5-turbo-0613",
      "gpt-3.5-turbo-16k": "gpt-3.5-turbo-16k-0613",
    };

    if (input.model in modelMaps) return modelMaps[input.model] as SupportedModel;

    return null;
  },
  inputSchema: inputSchema as JSONSchema4,
  shouldStream: (input) => input.stream ?? false,
};

export default modelProvider;
