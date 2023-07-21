import openaiChatCompletion from "./openai-ChatCompletion";
import replicateLlama2 from "./replicate-llama2";

const modelProviders = {
  "openai/ChatCompletion": openaiChatCompletion,
  "replicate/llama2": replicateLlama2,
} as const;

export default modelProviders;
