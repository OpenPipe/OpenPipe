import { type JSONSchema4 } from "json-schema";
import { type IconType } from "react-icons";
import { type JsonValue } from "type-fest";
import { z } from "zod";
import { type OpenpipeChatInput } from "./openpipe-chat";

export const ZodSupportedProvider = z.union([
  z.literal("openai/ChatCompletion"),
  z.literal("replicate/llama2"),
  z.literal("anthropic/completion"),
  z.literal("openpipe/Chat"),
]);

export type SupportedProvider = z.infer<typeof ZodSupportedProvider>;

export type Model = {
  name: string;
  contextWindow: number;
  promptTokenPrice?: number;
  completionTokenPrice?: number;
  pricePerSecond?: number;
  speed: "fast" | "medium" | "slow";
  provider: SupportedProvider;
  description?: string;
  learnMoreUrl?: string;
  apiDocsUrl?: string;
  templatePrompt?: (initialPrompt: OpenpipeChatInput["messages"]) => string;
  defaultStopTokens?: string[];
};

export type ProviderModel = { provider: z.infer<typeof ZodSupportedProvider>; model: string };

export type RefinementAction = { icon?: IconType; description: string; instructions: string };

export type FrontendModelProvider<SupportedModels extends string, OutputSchema> = {
  name: string;
  models: Record<SupportedModels, Model>;
  refinementActions?: Record<string, RefinementAction>;

  normalizeOutput: (output: OutputSchema) => NormalizedOutput;
};

export type CompletionResponse<T> =
  | { type: "error"; message: string; autoRetry: boolean; statusCode?: number }
  | {
      type: "success";
      value: T;
      timeToComplete: number;
      statusCode: number;
    };

export type ModelProvider<SupportedModels extends string, InputSchema, OutputSchema> = {
  getModel: (input: InputSchema) => SupportedModels | null;
  canStream: boolean;
  inputSchema: JSONSchema4;
  getCompletion: (
    input: InputSchema,
    onStream: ((partialOutput: OutputSchema) => void) | null,
  ) => Promise<CompletionResponse<OutputSchema>>;
  getUsage: (
    input: InputSchema,
    output?: OutputSchema,
    opts?: Record<string, unknown>,
  ) => { gpuRuntime?: number; inputTokens?: number; outputTokens?: number; cost?: number } | null;

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
