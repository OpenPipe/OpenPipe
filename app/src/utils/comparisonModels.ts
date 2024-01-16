import { ComparisonModel } from "@prisma/client";

export const comparisonModels: readonly ComparisonModel[] = [
  ComparisonModel.GPT_3_5_TURBO,
  ComparisonModel.GPT_4_0613,
  ComparisonModel.GPT_4_1106_PREVIEW,
] as const;

export const isComparisonModel = (modelId: string) =>
  ComparisonModel[modelId as keyof typeof ComparisonModel] !== undefined;

export const isComparisonModelName = (modelName: string) =>
  Object.values(COMPARISON_MODEL_NAMES).includes(modelName);

export const COMPARISON_MODEL_NAMES: Record<ComparisonModel, string> = {
  GPT_3_5_TURBO: "gpt-3.5-turbo-1106",
  GPT_4_1106_PREVIEW: "gpt-4-1106-preview",
  GPT_4_0613: "gpt-4-0613",
};

export const getComparisonModel = (modelName: string) => {
  const model = Object.entries(COMPARISON_MODEL_NAMES).find(([, name]) => name === modelName);
  if (!model) return null;
  return model[0] as ComparisonModel;
};

export const getComparisonModelName = (modelId: string) => {
  const model = Object.entries(COMPARISON_MODEL_NAMES).find(([id]) => id === modelId);
  if (!model) return null;
  return model[1];
};
