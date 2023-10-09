import { type JSONSchema4 } from "json-schema";
import { type BaseModel } from "@prisma/client";
import { type ChatCompletion, type ChatCompletionCreateParams } from "openai/resources/chat";

import { type ModelProvider } from "../types";
import inputSchema from "../openai-ChatCompletion/codegen/input.schema.json";
import { getExperimentsCompletion } from "./getCompletion";
import frontendModelProvider from "./frontend";
import { countLlamaChatTokensInMessages } from "~/utils/countTokens";
import { truthyFilter } from "~/utils/utils";

export type FineTunedModelProvider = ModelProvider<
  string,
  ChatCompletionCreateParams,
  ChatCompletion
>;

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

const modelProvider: FineTunedModelProvider = {
  getModel: (input) => {
    return input.model;
  },
  inputSchema: inputSchema as JSONSchema4,
  canStream: false,
  getCompletion: getExperimentsCompletion,
  getUsage: (input, output, opts) => {
    const model = modelProvider.getModel(input);
    if (!model) return null;

    let inputTokens: number;
    let outputTokens: number;

    if (output?.usage) {
      inputTokens = output.usage.prompt_tokens;
      outputTokens = output.usage.completion_tokens;
    } else {
      inputTokens = countLlamaChatTokensInMessages(input.messages);
      outputTokens = output
        ? countLlamaChatTokensInMessages(output.choices.map((c) => c.message).filter(truthyFilter))
        : 0;
    }

    let cost = undefined;
    const baseModel = opts?.baseModel as BaseModel | undefined;
    const baseModelPrice = baseModel ? baseModelPrices[baseModel] : undefined;
    if (baseModelPrice) {
      const { promptTokenPrice, completionTokenPrice } = baseModelPrice;
      cost = inputTokens * promptTokenPrice + outputTokens * completionTokenPrice;
    }

    return { inputTokens: inputTokens, outputTokens: outputTokens, cost };
  },
  ...frontendModelProvider,
};

export default modelProvider;
