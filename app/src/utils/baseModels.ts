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

export const getComparisonModelName = (comparisonModel: ComparisonModel) => {
  switch (comparisonModel) {
    case "GPT_3_5_TURBO":
      return "gpt-3.5-turbo";
  }
};
