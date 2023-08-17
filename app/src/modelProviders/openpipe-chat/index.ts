import { type JSONSchema4 } from "json-schema";
import { type ModelProvider } from "../types";
import inputSchema from "./input.schema.json";
import { getCompletion } from "./getCompletion";
import frontendModelProvider from "./frontend";

const supportedModels = ["Open-Orca/OpenOrcaxOpenChat-Preview2-13B"] as const;

export type SupportedModel = (typeof supportedModels)[number];

export type OpenpipeChatInput = {
  model: SupportedModel;
  messages: {
    role: "system" | "user" | "assistant";
    content: string;
  }[];
  temperature?: number;
  top_p?: number;
  stop?: string[] | string;
  max_tokens?: number;
  presence_penalty?: number;
  frequency_penalty?: number;
};

export type OpenpipeChatOutput = string;

export type OpenpipeChatModelProvider = ModelProvider<
  SupportedModel,
  OpenpipeChatInput,
  OpenpipeChatOutput
>;

const modelProvider: OpenpipeChatModelProvider = {
  getModel: (input) => {
    if (supportedModels.includes(input.model as SupportedModel))
      return input.model as SupportedModel;

    return null;
  },
  inputSchema: inputSchema as JSONSchema4,
  canStream: true,
  getCompletion,
  getUsage: (input, output) => {
    // TODO: Implement this
    return null;
  },
  ...frontendModelProvider,
};

export default modelProvider;
