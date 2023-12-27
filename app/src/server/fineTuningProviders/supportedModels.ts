import { ProviderWithModel, type BaseModel, baseModel } from "./types";

export type FrontendModelInfo = {
  name: string;
  trainable: boolean;
  cost: {
    training: number;
    input: number;
    output: number;
  };
};

const sevenBCosts = {
  training: 0.000004,
  input: 0.0000012,
  output: 0.0000016,
};

// Do not remove models from this list if any users still have them in production.
// Instead, mark them as `trainable: false` so no one else can create new models.
export const supportedModels: Record<ProviderWithModel, FrontendModelInfo> = {
  "openpipe:OpenPipe/mistral-ft-optimized-1227": {
    name: "Mistral 7B Optimized",
    cost: sevenBCosts,
    trainable: true,
  },
  "openpipe:mistralai/Mistral-7B-v0.1": {
    name: "Mistral 7B",
    cost: sevenBCosts,
    trainable: true,
  },
  "openpipe:meta-llama/Llama-2-7b-hf": {
    name: "Llama 2 7B",
    cost: sevenBCosts,
    trainable: true,
  },
  "openpipe:meta-llama/Llama-2-13b-hf": {
    name: "Llama 2 13B",
    cost: { training: 0.000008, input: 0.0000024, output: 0.0000032 },
    trainable: true,
  },
  "openai:gpt-3.5-turbo-1106": {
    name: "GPT 3.5 Turbo",
    cost: { training: 0.000008, input: 0.000012, output: 0.000016 },
    trainable: true,
  },

  // Old models, no longer supported for training
  "openpipe:teknium/OpenHermes-2.5-Mistral-7B": {
    name: "OpenHermes 2.5 7B",
    cost: sevenBCosts,
    trainable: false,
  },
  "openpipe:fblgit/una-cybertron-7b-v1-fp16": {
    name: "Una Cybertron 7B",
    cost: sevenBCosts,
    trainable: false,
  },
  "openpipe:HuggingFaceH4/zephyr-7b-beta": {
    name: "Zephyr 7B",
    cost: sevenBCosts,
    trainable: false,
  },
  "openpipe:Intel/neural-chat-7b-v3-3": {
    name: "Intel Neural Chat",
    cost: sevenBCosts,
    trainable: false,
  },

  "openpipe:OpenPipe/mistral-7b-1212": {
    name: "Mistral 7B Optimized (1212)",
    cost: sevenBCosts,
    trainable: false,
  },
  "openpipe:OpenPipe/mistral-7b-1213": {
    name: "Mistral 7B Optimized (1213)",
    cost: sevenBCosts,
    trainable: false,
  },
  "openpipe:OpenPipe/mistral-7b-1214": {
    name: "Mistral 7B Optimized (1214)",
    cost: sevenBCosts,
    trainable: false,
  },
  "openpipe:OpenPipe/mistral-7b-1214-alpha": {
    name: "Mistral 7B Optimized (1214a)",
    cost: sevenBCosts,
    trainable: false,
  },
  "openpipe:OpenPipe/mistral-7b-1214-beta": {
    name: "Mistral 7B Optimized (1214b)",
    cost: sevenBCosts,
    trainable: false,
  },
  "openpipe:OpenPipe/mistral-7b-1214-gamma": {
    name: "Mistral 7B Optimized (1214g)",
    cost: sevenBCosts,
    trainable: false,
  },

  "openai:gpt-3.5-turbo-0613": {
    name: "GPT 3.5 Turbo (0613)",
    cost: { training: 0.000008, input: 0.000012, output: 0.000016 },
    trainable: false,
  },

  "openpipe:PulsarAI/OpenHermes-2.5-neural-chat-v3-3-Slerp": {
    name: "Hermes Neural 7B",
    cost: sevenBCosts,
    trainable: false,
  },

  "openpipe:OpenPipe/mistral-ft-optimized-1218": {
    name: "Mistral 7B Optimized (1218)",
    cost: sevenBCosts,
    trainable: false,
  },
};

export const splitProvider = (model: ProviderWithModel): BaseModel =>
  baseModel.parse({
    provider: model.split(":")[0],
    baseModel: model.split(":")[1],
  });

export const modelInfo = (model: BaseModel): FrontendModelInfo => {
  const modelWithProvider = (model.provider + ":" + model.baseModel) as ProviderWithModel;
  const info = supportedModels[modelWithProvider];
  if (!info) {
    throw new Error("Unknown model: " + JSON.stringify(model));
  }
  return info;
};

export const calculateCost = (
  model: BaseModel,
  trainingTokens: number,
  inputTokens: number,
  outputTokens: number,
) => {
  const info = modelInfo(model);
  return (
    info.cost.training * trainingTokens +
    info.cost.input * inputTokens +
    info.cost.output * outputTokens
  );
};
