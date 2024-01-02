import { z } from "zod";

// Don't remove entries from this list if there are still customer models that
// use them! Set them as trainable: false in the ../supportedModels file instead
// to hide them from the UI.
export const supportedModels = z.enum([
  "mistralai/Mistral-7B-v0.1",
  "meta-llama/Llama-2-13b-hf",
  "meta-llama/Llama-2-7b-hf",
  "OpenPipe/mistral-ft-optimized-1218",
  "OpenPipe/mistral-ft-optimized-1227",
]);
