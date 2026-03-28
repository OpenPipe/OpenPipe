import { type ChatCompletion, type ChatCompletionCreateParams } from "openai/resources/chat";
import frontendModelProvider from "./frontend";

type MiniMaxModel = keyof typeof frontendModelProvider.models;

const supportedModels = Object.keys(frontendModelProvider.models) as MiniMaxModel[];

const getModel = (model: string): MiniMaxModel | null => {
  if (supportedModels.includes(model as MiniMaxModel)) return model as MiniMaxModel;
  return null;
};

const modelProvider = {
  getUsage: (input: ChatCompletionCreateParams, output?: ChatCompletion) => {
    const model = getModel(output?.model ?? input.model.replace("minimax:", ""));

    const inputTokens = output?.usage?.prompt_tokens ?? undefined;
    const outputTokens = output?.usage?.completion_tokens ?? undefined;

    let cost = undefined;
    if (model && inputTokens && outputTokens) {
      const { promptTokenPrice, completionTokenPrice } = frontendModelProvider.models[model];
      cost = inputTokens * promptTokenPrice + outputTokens * completionTokenPrice;
    }

    return { inputTokens, outputTokens, cost };
  },
  ...frontendModelProvider,
};

export default modelProvider;
