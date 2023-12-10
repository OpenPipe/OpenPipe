import { type BaseModel } from "./types";

export const supportedModels: [BaseModel, ...BaseModel[]] = [
  { provider: "openpipe", baseModel: "mistralai/Mistral-7B-v0.1" },
  { provider: "openpipe", baseModel: "meta-llama/Llama-2-7b-hf" },
  { provider: "openpipe", baseModel: "meta-llama/Llama-2-13b-hf" },
  { provider: "openai", baseModel: "gpt-3.5-turbo-1106" },
];
