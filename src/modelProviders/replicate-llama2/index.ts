import { type ModelProvider } from "../types";
import frontendModelProvider from "./frontend";
import { getCompletion } from "./getCompletion";

const supportedModels = ["7b-chat", "13b-chat", "70b-chat"] as const;

export type SupportedModel = (typeof supportedModels)[number];

export type ReplicateLlama2Input = {
  model: SupportedModel;
  prompt: string;
  stream?: boolean;
  max_length?: number;
  temperature?: number;
  top_p?: number;
  repetition_penalty?: number;
  debug?: boolean;
};

export type ReplicateLlama2Output = string[];

export type ReplicateLlama2Provider = ModelProvider<
  SupportedModel,
  ReplicateLlama2Input,
  ReplicateLlama2Output
>;

const modelProvider: ReplicateLlama2Provider = {
  getModel: (input) => {
    if (supportedModels.includes(input.model)) return input.model;

    return null;
  },
  inputSchema: {
    type: "object",
    properties: {
      model: {
        type: "string",
        enum: supportedModels as unknown as string[],
      },
      prompt: {
        type: "string",
      },
      stream: {
        type: "boolean",
      },
      max_length: {
        type: "number",
      },
      temperature: {
        type: "number",
      },
      top_p: {
        type: "number",
      },
      repetition_penalty: {
        type: "number",
      },
      debug: {
        type: "boolean",
      },
    },
    required: ["model", "prompt"],
  },
  shouldStream: (input) => input.stream ?? false,
  getCompletion,
  ...frontendModelProvider,
};

export default modelProvider;
