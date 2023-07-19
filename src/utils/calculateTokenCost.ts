import { modelStats } from "~/server/modelStats";
import { type SupportedModel, OpenAIChatModel } from "~/server/types";

export const calculateTokenCost = (
  model: SupportedModel | string | null,
  numTokens: number,
  isCompletion = false,
) => {
  if (!model) return 0;
  if (model in OpenAIChatModel) {
    return calculateOpenAIChatTokenCost(model as OpenAIChatModel, numTokens, isCompletion);
  }
  return 0;
};

const calculateOpenAIChatTokenCost = (
  model: OpenAIChatModel,
  numTokens: number,
  isCompletion: boolean,
) => {
  const tokensToDollars = isCompletion
    ? modelStats[model].completionTokenPrice
    : modelStats[model].promptTokenPrice;
  return tokensToDollars * numTokens;
};
