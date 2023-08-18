import { type JSONSchema4 } from "json-schema";
import { type ModelProvider } from "../types";
import inputSchema from "./input.schema.json";
import { getCompletion } from "./getCompletion";
import frontendModelProvider from "./frontend";

const supportedModels = [
  "Open-Orca/OpenOrcaxOpenChat-Preview2-13B",
  "Open-Orca/OpenOrca-Platypus2-13B",
  // "stabilityai/StableBeluga-13B",
  "NousResearch/Nous-Hermes-Llama2-13b",
  "jondurbin/airoboros-l2-13b-gpt4-2.0",
  "lmsys/vicuna-13b-v1.5",
  "Gryphe/MythoMax-L2-13b",
  "NousResearch/Nous-Hermes-llama-2-7b",
] as const;

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
  getModel: (input) => input.model,
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
