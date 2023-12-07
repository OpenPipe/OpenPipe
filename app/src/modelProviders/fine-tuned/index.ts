import { type BaseModel } from "@prisma/client";
import { type JSONSchema4 } from "json-schema";
import { type ChatCompletion, type ChatCompletionCreateParams } from "openai/resources/chat";

import { countLlamaInputTokens, countLlamaOutputTokens } from "~/utils/countTokens";
import inputSchema from "../openai-ChatCompletion/codegen/input.schema.json";
import { type ModelProvider } from "../types";
import frontendModelProvider from "./frontend";
import getCompletionForExperiments from "./getCompletionForExperiments";
import { BASE_MODEL_PRICES } from "~/utils/baseModels";

export type FineTunedModelProvider = ModelProvider<
  string,
  ChatCompletionCreateParams,
  ChatCompletion
>;

const modelProvider: FineTunedModelProvider = {
  getModel: (input) => {
    return input.model;
  },
  inputSchema: inputSchema as JSONSchema4,
  canStream: false,
  getCompletion: getCompletionForExperiments,
  getUsage: (input, output, opts) => {
    const model = modelProvider.getModel(input);
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
    const baseModel = opts?.baseModel as BaseModel | undefined;
    const baseModelPrice = baseModel ? BASE_MODEL_PRICES[baseModel] : undefined;
    if (baseModelPrice) {
      cost = inputTokens * baseModelPrice.input + outputTokens * baseModelPrice.output;
    }

    return { inputTokens, outputTokens, cost };
  },
  ...frontendModelProvider,
};

export default modelProvider;
