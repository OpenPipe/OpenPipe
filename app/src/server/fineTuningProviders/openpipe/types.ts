import { z } from "zod";

// Don't remove entries from this list if there are still customer models that
// use them! Set them as trainable: false in the ../supportedModels file instead
// to hide them from the UI.
export const supportedModels = z.enum([
  "OpenPipe/mistral-7b-1212",
  "OpenPipe/mistral-7b-1213",
  "OpenPipe/mistral-7b-1214",
  "OpenPipe/mistral-7b-1214-alpha",
  "OpenPipe/mistral-7b-1214-beta",
  "OpenPipe/mistral-7b-1214-gamma",
  "PulsarAI/OpenHermes-2.5-neural-chat-v3-3-Slerp",
  "mistralai/Mistral-7B-v0.1",
  "meta-llama/Llama-2-13b-hf",
  "meta-llama/Llama-2-7b-hf",

  "teknium/OpenHermes-2.5-Mistral-7B",
  "fblgit/una-cybertron-7b-v1-fp16",
  "HuggingFaceH4/zephyr-7b-beta",
  "Intel/neural-chat-7b-v3-3",
  "OpenPipe/mistral-ft-optimized-1218",
  "OpenPipe/mistral-ft-optimized-1227",
]);
