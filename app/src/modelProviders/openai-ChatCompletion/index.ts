import { type JSONSchema4 } from "json-schema";
import { type ModelProvider } from "../types";
import inputSchema from "./codegen/input.schema.json";
import { type ChatCompletion, type ChatCompletionCreateParams } from "openai/resources/chat";
import { getCompletion } from "./getCompletion";
import frontendModelProvider from "./frontend";
import { countOpenAIChatTokens } from "~/utils/countTokens";
import { truthyFilter } from "~/utils/utils";

const supportedModels = [
  "gpt-4-0613",
  "gpt-4-32k-0613",
  "gpt-3.5-turbo-0613",
  "gpt-3.5-turbo-16k-0613",
] as const;

export type SupportedModel = (typeof supportedModels)[number];

export type OpenaiChatModelProvider = ModelProvider<
  SupportedModel,
  ChatCompletionCreateParams,
  ChatCompletion
>;

const modelProvider: OpenaiChatModelProvider = {
  getModel: (input) => {
    if (supportedModels.includes(input.model as SupportedModel))
      return input.model as SupportedModel;

    const modelMaps: Record<string, SupportedModel> = {
      "gpt-4": "gpt-4-0613",
      "gpt-4-32k": "gpt-4-32k-0613",
      "gpt-3.5-turbo": "gpt-3.5-turbo-0613",
      "gpt-3.5-turbo-16k": "gpt-3.5-turbo-16k-0613",
    };

    if (input.model in modelMaps) return modelMaps[input.model] as SupportedModel;

    return null;
  },
  inputSchema: inputSchema as JSONSchema4,
  canStream: true,
  getCompletion,
  getUsage: (input, output) => {
    const model = modelProvider.getModel(input);
    if (!model) return null;

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
