import { BaseModel, ComparisonModel } from "@prisma/client";

export const SUPPORTED_BASE_MODELS = [
  "MISTRAL_7b",
  "OPENHERMES_2_5",
  "ZEPHYR_7B_BETA",
  "LLAMA2_7b",
  "LLAMA2_13b",
  "GPT_3_5_TURBO",
] as [BaseModel, ...BaseModel[]];

export const displayBaseModel = (baseModel: BaseModel): string => {
  switch (baseModel) {
    case "MISTRAL_7b":
      return "Mistral 7B";
    case "LLAMA2_7b":
      return "Llama2 7B";
    case "LLAMA2_13b":
      return "Llama2 13B";
    case "OPENHERMES_2_5":
      return "OpenHermes 2.5 7B";
    case "ZEPHYR_7B_BETA":
      return "Zephyr 7B Beta";
    case "GPT_3_5_TURBO":
      return "GPT 3.5 Turbo (1106)";
  }
};

export const BASE_MODEL_PRICES: Record<
  BaseModel,
  { training: number; input: number; output: number }
> = {
  MISTRAL_7b: { training: 0.000004, input: 0.0000012, output: 0.0000016 },
  OPENHERMES_2_5: { training: 0.000004, input: 0.0000012, output: 0.0000016 },
  ZEPHYR_7B_BETA: { training: 0.000004, input: 0.0000012, output: 0.0000016 },
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
