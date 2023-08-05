import { type JSONSchema4 } from "json-schema";
import { type ModelProvider } from "../types";
import inputSchema from "./codegen/input.schema.json";
import { getCompletion } from "./getCompletion";
import frontendModelProvider from "./frontend";
import type { Completion, CompletionCreateParams } from "@anthropic-ai/sdk/resources";

const supportedModels = ["claude-2.0", "claude-instant-1.1"] as const;

export type SupportedModel = (typeof supportedModels)[number];

export type AnthropicProvider = ModelProvider<SupportedModel, CompletionCreateParams, Completion>;

const modelProvider: AnthropicProvider = {
  getModel: (input) => {
    if (supportedModels.includes(input.model as SupportedModel))
      return input.model as SupportedModel;

    const modelMaps: Record<string, SupportedModel> = {
      "claude-2": "claude-2.0",
      "claude-instant-1": "claude-instant-1.1",
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
