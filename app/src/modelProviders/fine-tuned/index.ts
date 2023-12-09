import { type BaseModel } from "@prisma/client";
import { type ChatCompletion, type ChatCompletionCreateParams } from "openai/resources/chat";

import { countLlamaInputTokens, countLlamaOutputTokens } from "~/utils/countTokens";
import { BASE_MODEL_PRICES } from "~/utils/baseModels";

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

    const baseModelPrice = baseModel ? BASE_MODEL_PRICES[baseModel] : undefined;
    if (baseModelPrice) {
      cost = inputTokens * baseModelPrice.input + outputTokens * baseModelPrice.output;
    }

    return { inputTokens, outputTokens, cost };
  },
};

export default modelProvider;
