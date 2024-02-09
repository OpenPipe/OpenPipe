import { type ChatCompletion, type ChatCompletionCreateParams } from "openai/resources/chat";
import { countOpenAIChatTokens } from "~/utils/countTokens";
import { truthyFilter } from "~/utils/utils";
import frontendModelProvider from "./frontend";

const supportedModels = [
  "gpt-4-0125-preview",
  "gpt-4-1106-preview",
  "gpt-4-0613",
  "gpt-4-32k-0613",
  "gpt-3.5-turbo-0125",
  "gpt-3.5-turbo-1106",
  "gpt-3.5-turbo-0613",
  "gpt-3.5-turbo-16k-0613",
] as const;

export type SupportedModel = (typeof supportedModels)[number];

const getModel = (model: string) => {
  if (supportedModels.includes(model as SupportedModel)) return model as SupportedModel;

  const modelMaps: Record<string, SupportedModel> = {
    "gpt-4": "gpt-4-0613",
    "gpt-4-32k": "gpt-4-32k-0613",
    "gpt-3.5-turbo": "gpt-3.5-turbo-0613",
    "gpt-3.5-turbo-16k": "gpt-3.5-turbo-16k-0613",
  };

  if (model in modelMaps) return modelMaps[model] as SupportedModel;

  return null;
};

const modelProvider = {
  getUsage: (input: ChatCompletionCreateParams, output?: ChatCompletion) => {
    const model = getModel(output?.model ?? input.model);
    if (!model)
      return {
        inputTokens: output?.usage?.prompt_tokens ?? undefined,
        outputTokens: output?.usage?.completion_tokens ?? undefined,
        cost: undefined,
      };

    let inputTokens: number;
    let outputTokens: number;

    if (output?.usage) {
      inputTokens = output.usage.prompt_tokens;
      outputTokens = output.usage.completion_tokens;
    } else {
      try {
        inputTokens = countOpenAIChatTokens(model, input.messages);
        outputTokens = output
          ? countOpenAIChatTokens(model, output.choices.map((c) => c.message).filter(truthyFilter))
          : 0;
      } catch (err) {
        inputTokens = 0;
        outputTokens = 0;
        // TODO handle this, library seems like maybe it doesn't work with function calls?
        console.error(err);
      }
    }

    const { promptTokenPrice, completionTokenPrice } = frontendModelProvider.models[model];
    let cost = undefined;
    if (promptTokenPrice && completionTokenPrice && inputTokens && outputTokens) {
      cost = inputTokens * promptTokenPrice + outputTokens * completionTokenPrice;
    }

    return { inputTokens: inputTokens, outputTokens: outputTokens, cost };
  },
  ...frontendModelProvider,
};

export default modelProvider;
