import { type JSONSchema4 } from "json-schema";
import { type ModelProvider } from "../types";
import inputSchema from "./codegen/input.schema.json";
import { type ChatCompletion, type CompletionCreateParams } from "openai/resources/chat";
import { getCompletion } from "./getCompletion";
import frontendModelProvider from "./frontend";

const supportedModels = [
  "gpt-4-0613",
  "gpt-4-32k-0613",
  "gpt-3.5-turbo-0613",
  "gpt-3.5-turbo-16k-0613",
] as const;

export type SupportedModel = (typeof supportedModels)[number];

export type OpenaiChatModelProvider = ModelProvider<
  SupportedModel,
  CompletionCreateParams,
  ChatCompletion
>;

const modelProvider: OpenaiChatModelProvider = {
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
  canStream: true,
  getCompletion,
  ...frontendModelProvider,
};

export default modelProvider;
