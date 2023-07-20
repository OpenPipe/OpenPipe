import openaiChatCompletion from "./openai-ChatCompletion";

const modelProviders = {
  "openai/ChatCompletion": openaiChatCompletion,
} as const;

export default modelProviders;
