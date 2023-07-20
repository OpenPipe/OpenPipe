import { type JSONSchema4 } from "json-schema";

export type ModelProviderModel = {
  name: string;
  learnMore: string;
};

export type ModelProvider<SupportedModels extends string, InputSchema> = {
  name: string;
  models: Record<SupportedModels, ModelProviderModel>;
  getModel: (input: InputSchema) => SupportedModels | null;
  shouldStream: (input: InputSchema) => boolean;
  inputSchema: JSONSchema4;
};
