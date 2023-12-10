import { type BaseModel } from "./types";

export type FrontendModelInfo = {
  name: string;
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

export const modelInfo = (model: BaseModel): FrontendModelInfo => {
  switch (model.provider) {
    case "openai":
      return {
        "gpt-3.5-turbo-1106": {
          name: "GPT 3.5 Turbo",
          cost: {
            training: 0.000008,
            input: 0.000012,
            output: 0.000016,
          },
        },
        "gpt-3.5-turbo-0613": {
          name: "GPT 3.5 Turbo (0613)",
          cost: {
            training: 0.000008,
            input: 0.000012,
            output: 0.000016,
          },
        },
      }[model.baseModel];
    case "openpipe":
      return {
        "mistralai/Mistral-7B-v0.1": {
          name: "Mistral 7B",
          cost: sevenBCosts,
        },
        "meta-llama/Llama-2-7b-hf": {
          name: "Llama 2 7B",
          cost: sevenBCosts,
        },
        "meta-llama/Llama-2-13b-hf": {
          name: "Llama 2 13B",
          cost: {
            training: 0.000008,
            input: 0.0000024,
            output: 0.0000032,
          },
        },
      }[model.baseModel];
  }
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
