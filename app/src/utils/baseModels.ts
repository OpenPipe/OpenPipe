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
      return "gpt-3.5-turbo";
  }
};

export const isComparisonModel = (modelId: string) =>
  ComparisonModel[modelId as keyof typeof ComparisonModel] !== undefined;

export const isComparisonModelName = (modelName: string) =>
  Object.values(COMPARISON_MODEL_NAMES).includes(modelName);

export const COMPARISON_MODEL_NAMES: Record<ComparisonModel, string> = {
  GPT_3_5_TURBO: "gpt-3.5-turbo-0613",
};

export const getComparisonModel = (modelName: string) => {
  const model = Object.entries(COMPARISON_MODEL_NAMES).find(([, name]) => name === modelName);
  if (!model) return null;
  return model[0] as ComparisonModel;
};
