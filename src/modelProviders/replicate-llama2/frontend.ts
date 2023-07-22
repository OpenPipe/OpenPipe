import { type SupportedModel, type ReplicateLlama2Output } from ".";
import { type FrontendModelProvider } from "../types";

const frontendModelProvider: FrontendModelProvider<SupportedModel, ReplicateLlama2Output> = {
  name: "Replicate Llama2",

  models: {
    "7b-chat": {
      name: "LLama 2 7B Chat",
      contextWindow: 4096,
      pricePerSecond: 0.0023,
      speed: "fast",
      provider: "replicate/llama2",
      learnMoreUrl: "https://replicate.com/a16z-infra/llama7b-v2-chat"
    },
    "13b-chat": {
      name: "LLama 2 13B Chat",
      contextWindow: 4096,
      pricePerSecond: 0.0023,
      speed: "medium",
      provider: "replicate/llama2",
      learnMoreUrl: "https://replicate.com/a16z-infra/llama13b-v2-chat"
    },
    "70b-chat": {
      name: "LLama 2 70B Chat",
      contextWindow: 4096,
      pricePerSecond: 0.0032,
      speed: "slow",
      provider: "replicate/llama2",
      learnMoreUrl: "https://replicate.com/replicate/llama70b-v2-chat"
    },
  },

  normalizeOutput: (output) => {
    return {
      type: "text",
      value: output.join(""),
    };
  },
};

export default frontendModelProvider;
