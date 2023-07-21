import { type JSONSchema4 } from "json-schema";
import { type JsonValue } from "type-fest";

export type SupportedProvider = "openai/ChatCompletion" | "replicate/llama2";

type ModelInfo = {
  name?: string;
  learnMore?: string;
};

export type FrontendModelProvider<SupportedModels extends string, OutputSchema> = {
  name: string;
  models: Record<SupportedModels, ModelInfo>;

  normalizeOutput: (output: OutputSchema) => NormalizedOutput;
};

export type CompletionResponse<T> =
  | { type: "error"; message: string; autoRetry: boolean; statusCode?: number }
  | {
      type: "success";
      value: T;
      timeToComplete: number;
      statusCode: number;
      promptTokens?: number;
      completionTokens?: number;
      cost?: number;
    };

export type ModelProvider<SupportedModels extends string, InputSchema, OutputSchema> = {
  getModel: (input: InputSchema) => SupportedModels | null;
  shouldStream: (input: InputSchema) => boolean;
  inputSchema: JSONSchema4;
  getCompletion: (
    input: InputSchema,
    onStream: ((partialOutput: OutputSchema) => void) | null,
  ) => Promise<CompletionResponse<OutputSchema>>;

  // This is just a convenience for type inference, don't use it at runtime
  _outputSchema?: OutputSchema | null;
} & FrontendModelProvider<SupportedModels, OutputSchema>;

export type NormalizedOutput =
  | {
      type: "text";
      value: string;
    }
  | {
      type: "json";
      value: JsonValue;
    };
