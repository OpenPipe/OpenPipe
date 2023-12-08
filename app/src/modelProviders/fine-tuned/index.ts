import { type BaseModel } from "@prisma/client";
import { type ChatCompletion, type ChatCompletionCreateParams } from "openai/resources/chat";

import { countLlamaInputTokens, countLlamaOutputTokens } from "~/utils/countTokens";

const baseModelPrices: Record<
  BaseModel,
  { promptTokenPrice: number; completionTokenPrice: number } | undefined
> = {
  MISTRAL_7b: {
    promptTokenPrice: 0.0000012,
    completionTokenPrice: 0.0000016,
  },
  LLAMA2_7b: {
    promptTokenPrice: 0.0000012,
    completionTokenPrice: 0.0000016,
  },
  LLAMA2_13b: {
    promptTokenPrice: 0.0000024,
    completionTokenPrice: 0.0000032,
  },
  GPT_3_5_TURBO: {
    promptTokenPrice: 0.000008,
    completionTokenPrice: 0.000012,
  },
};

const modelProvider = {
  getUsage: (input: ChatCompletionCreateParams, output?: ChatCompletion, baseModel?: BaseModel) => {
    const model = input.model;
    if (!model) return null;

    let inputTokens: number;
    let outputTokens: number;

    if (output?.usage) {
      inputTokens = output.usage.prompt_tokens;
      outputTokens = output.usage.completion_tokens;
    } else {
      inputTokens = countLlamaInputTokens(input);
      outputTokens = output
        ? output.choices.map((c) => countLlamaOutputTokens(c.message)).reduce((a, b) => a + b)
        : 0;
    }

    let cost = undefined;
    const baseModelPrice = baseModel ? baseModelPrices[baseModel] : undefined;
    if (baseModelPrice) {
      const { promptTokenPrice, completionTokenPrice } = baseModelPrice;
      cost = inputTokens * promptTokenPrice + outputTokens * completionTokenPrice;
    }

    return { inputTokens: inputTokens, outputTokens: outputTokens, cost };
  },
};

export default modelProvider;
