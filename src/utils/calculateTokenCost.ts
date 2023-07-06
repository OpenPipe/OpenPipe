import { type SupportedModel, OpenAIChatModel } from "~/server/types";

const openAIPromptTokensToDollars: { [key in OpenAIChatModel]: number } = {
  "gpt-4": 0.00003,
  "gpt-4-0613": 0.00003,
  "gpt-4-32k": 0.00006,
  "gpt-4-32k-0613": 0.00006,
  "gpt-3.5-turbo": 0.0000015,
  "gpt-3.5-turbo-0613": 0.0000015,
  "gpt-3.5-turbo-16k": 0.000003,
  "gpt-3.5-turbo-16k-0613": 0.000003,
};

const openAICompletionTokensToDollars: { [key in OpenAIChatModel]: number } = {
  "gpt-4": 0.00006,
  "gpt-4-0613": 0.00006,
  "gpt-4-32k": 0.00012,
  "gpt-4-32k-0613": 0.00012,
  "gpt-3.5-turbo": 0.000002,
  "gpt-3.5-turbo-0613": 0.000002,
  "gpt-3.5-turbo-16k": 0.000004,
  "gpt-3.5-turbo-16k-0613": 0.000004,
};

export const calculateTokenCost = (
  model: SupportedModel | null,
  numTokens: number,
  isCompletion = false
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
  isCompletion: boolean
) => {
  const tokensToDollars = isCompletion
    ? openAICompletionTokensToDollars[model]
    : openAIPromptTokensToDollars[model];
  return tokensToDollars * numTokens;
};
