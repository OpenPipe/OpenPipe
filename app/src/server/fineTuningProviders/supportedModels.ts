import { type ProviderWithModel, type BaseModel, baseModel } from "./types";

export type FrontendModelInfo = {
  name: string;
  trainable: boolean;
  cost: {
    training: number;
    input: number;
    output: number;
  };
};

// Cost in dollars per million tokens
const cpm = (dollars: number) => dollars / 1e6;

const sevenBCosts = {
  training: cpm(4),
  input: cpm(1.2),
  output: cpm(1.6),
};

// Do not remove models from this list if any users still have them in production.
// Instead, mark them as `trainable: false` so no one else can create new models.
export const supportedModels: Record<ProviderWithModel, FrontendModelInfo> = {
  "openpipe:OpenPipe/mistral-ft-optimized-1227": {
    name: "Mistral 7B Optimized",
    cost: sevenBCosts,
    trainable: true,
  },
  "openpipe:mistralai/Mistral-7B-Instruct-v0.2": {
    name: "Mistral 7B Instruct v0.2",
    cost: sevenBCosts,
    trainable: true,
  },
  "openpipe:mistralai/Mixtral-8x7B-Instruct-v0.1": {
    name: "Mixtral 8x7B Instruct",
    cost: {
      training: cpm(8),
      input: cpm(2.4),
      output: cpm(3.2),
    },
    trainable: true,
  },
  "openpipe:meta-llama/Llama-2-13b-hf": {
    name: "Llama 2 13B",
    cost: { training: cpm(8), input: cpm(2.4), output: cpm(3.2) },
    trainable: true,
  },
  "openai:gpt-3.5-turbo-1106": {
    name: "GPT 3.5 Turbo (1106)",
    cost: { training: cpm(8), input: cpm(3), output: cpm(6) },
    trainable: true,
  },
  "openai:gpt-3.5-turbo-0125": {
    name: "GPT 3.5 Turbo (0125)",
    cost: { training: cpm(8), input: cpm(3), output: cpm(6) },
    trainable: true,
  },
  "openpipe:mistralai/Mistral-7B-v0.1": {
    name: "Mistral 7B",
    cost: sevenBCosts,
    trainable: false,
  },

  // Old models, no longer supported for training
  "openai:gpt-3.5-turbo-0613": {
    name: "GPT 3.5 Turbo (0613)",
    cost: { training: cpm(8), input: cpm(12), output: cpm(16) },
    trainable: false,
  },
  "openpipe:OpenPipe/mistral-ft-optimized-1218": {
    name: "Mistral 7B Optimized (1218)",
    cost: sevenBCosts,
    trainable: false,
  },
  "openpipe:meta-llama/Llama-2-7b-hf": {
    name: "Llama 2 7B",
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
  const trainingCost = info.cost.training * trainingTokens;
  const inputCost = info.cost.input * inputTokens;
  const outputCost = info.cost.output * outputTokens;
  return {
    cost: trainingCost + inputCost + outputCost,
    inputCost,
    outputCost,
  };
};
