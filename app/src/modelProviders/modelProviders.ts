import openaiChatCompletion from "./openai-ChatCompletion";
import replicateLlama2 from "./replicate-llama2";
import anthropic from "./anthropic";
import { type SupportedProvider, type ModelProvider } from "./types";

const modelProviders: Record<SupportedProvider, ModelProvider<any, any, any>> = {
  "openai/ChatCompletion": openaiChatCompletion,
  "replicate/llama2": replicateLlama2,
  anthropic,
};

export default modelProviders;
