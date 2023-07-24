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
      system_prompt: {
        type: "string",
        description:
          "System prompt to send to Llama v2. This is prepended to the prompt and helps guide system behavior.",
      },
      prompt: {
        type: "string",
        description: "Prompt to send to Llama v2.",
      },
      stream: {
        type: "boolean",
        description: "Whether to stream output from Llama v2.",
      },
      max_new_tokens: {
        type: "number",
        description:
          "Maximum number of tokens to generate. A word is generally 2-3 tokens (minimum: 1)",
      },
      temperature: {
        type: "number",
        description:
          "Adjusts randomness of outputs, greater than 1 is random and 0 is deterministic, 0.75 is a good starting value. (minimum: 0.01; maximum: 5)",
      },
      top_p: {
        type: "number",
        description:
          "When decoding text, samples from the top p percentage of most likely tokens; lower to ignore less likely tokens (minimum: 0.01; maximum: 1)",
      },
      repetition_penalty: {
        type: "number",
        description:
          "Penalty for repeated words in generated text; 1 is no penalty, values greater than 1 discourage repetition, less than 1 encourage it. (minimum: 0.01; maximum: 5)",
      },
      debug: {
        type: "boolean",
        description: "provide debugging output in logs",
      },
    },
    required: ["model", "prompt"],
  },
  shouldStream: (input) => input.stream ?? false,
  getCompletion,
  ...frontendModelProvider,
};

export default modelProvider;
