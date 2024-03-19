import { ComparisonModel } from "@prisma/client";

export const comparisonModels: readonly ComparisonModel[] = [
  ComparisonModel.GPT_3_5_TURBO,
  ComparisonModel.GPT_4_0613,
  ComparisonModel.GPT_4_0125_PREVIEW,
] as const;

export const isComparisonModel = (modelId: string) =>
  ComparisonModel[modelId as keyof typeof ComparisonModel] !== undefined;

export const isComparisonModelName = (modelName: string) =>
  Object.values(COMPARISON_MODEL_NAMES).some((model) => model.name === modelName);

export const COMPARISON_MODEL_NAMES: Record<ComparisonModel, { name: string; slug: string }> = {
  GPT_3_5_TURBO: { name: "gpt-3.5-turbo-1106", slug: "GPT-3.5 Turbo (-1106)" },
  GPT_4_0613: { name: "gpt-4-0613", slug: "GPT-4 (-0613)" },
  GPT_4_1106_PREVIEW: { name: "gpt-4-1106-preview", slug: "GPT-4 Turbo (-1106)" },
  GPT_4_0125_PREVIEW: { name: "gpt-4-0125-preview", slug: "GPT-4 Turbo (-0125)" },
};

export const getComparisonModel = (name: string) => {
  const model = Object.entries(COMPARISON_MODEL_NAMES).find(([, value]) => value.name === name);
  if (!model) return null;
  return model[0] as ComparisonModel;
};

export const getComparisonModelName = (key: ComparisonModel) => {
  const model = Object.entries(COMPARISON_MODEL_NAMES).find(([id]) => id === key);
  if (!model) return null;
  return model[1].name;
};

export const getComparisonModelSlug = (key: ComparisonModel) => {
  const model = Object.entries(COMPARISON_MODEL_NAMES).find(([id]) => id === key);
  if (!model) return null;
  return model[1].slug;
};
