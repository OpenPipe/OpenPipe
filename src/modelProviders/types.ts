import { type JSONSchema4 } from "json-schema";
import { type JsonValue } from "type-fest";
import { z } from "zod";

const ZodSupportedProvider = z.union([
  z.literal("openai/ChatCompletion"),
  z.literal("replicate/llama2"),
]);

export type SupportedProvider = z.infer<typeof ZodSupportedProvider>;

export const ZodModel = z.object({
  name: z.string(),
  contextWindow: z.number(),
  promptTokenPrice: z.number().optional(),
  completionTokenPrice: z.number().optional(),
  pricePerSecond: z.number().optional(),
  speed: z.union([z.literal("fast"), z.literal("medium"), z.literal("slow")]),
  provider: ZodSupportedProvider,
  description: z.string().optional(),
  learnMoreUrl: z.string().optional(),
});

export type Model = z.infer<typeof ZodModel>;

export type FrontendModelProvider<SupportedModels extends string, OutputSchema> = {
  name: string;
  models: Record<SupportedModels, Model>;

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
