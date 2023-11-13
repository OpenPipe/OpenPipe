import { BaseModel, ComparisonModel } from "@prisma/client";

export const SUPPORTED_BASE_MODELS = Object.values(BaseModel) as [BaseModel, ...BaseModel[]];

export const displayBaseModel = (baseModel: BaseModel) => {
  switch (baseModel) {
    case "MISTRAL_7b":
      return "mistral-7b";
    case "LLAMA2_7b":
      return "llama2-7b";
    case "LLAMA2_13b":
      return "llama2-13b";
    case "GPT_3_5_TURBO":
      return "gpt-3.5-turbo-1106";
  }
};

const BASE_MODEL_PRICES: Record<BaseModel, { training: number; input: number; output: number }> = {
  MISTRAL_7b: { training: 0.000004, input: 0.0000012, output: 0.0000016 },
  LLAMA2_7b: { training: 0.000004, input: 0.0000012, output: 0.0000016 },
  LLAMA2_13b: { training: 0.000008, input: 0.0000024, output: 0.0000032 },
  GPT_3_5_TURBO: { training: 0.000008, input: 0.000012, output: 0.000016 },
};

export const calculateFineTuneUsageCost = ({
  trainingTokens = 0,
  inputTokens = 0,
  outputTokens = 0,
  baseModel,
}: {
  trainingTokens?: number;
  inputTokens?: number;
  outputTokens?: number;
  baseModel: BaseModel;
}) => {
  const { training, input, output } = BASE_MODEL_PRICES[baseModel];
  return training * trainingTokens + input * inputTokens + output * outputTokens;
};

export const isComparisonModel = (modelId: string) =>
  ComparisonModel[modelId as keyof typeof ComparisonModel] !== undefined;

export const isComparisonModelName = (modelName: string) =>
  Object.values(COMPARISON_MODEL_NAMES).includes(modelName);

export const COMPARISON_MODEL_NAMES: Record<ComparisonModel, string> = {
  GPT_3_5_TURBO: "gpt-3.5-turbo-1106",
};

export const getComparisonModel = (modelName: string) => {
  const model = Object.entries(COMPARISON_MODEL_NAMES).find(([, name]) => name === modelName);
  if (!model) return null;
  return model[0] as ComparisonModel;
};
