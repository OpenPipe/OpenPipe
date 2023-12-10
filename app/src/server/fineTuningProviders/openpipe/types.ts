import { z } from "zod";

export const supportedModels = z.enum([
  "mistralai/Mistral-7B-v0.1",
  "meta-llama/Llama-2-13b-hf",
  "meta-llama/Llama-2-7b-hf",
]);
