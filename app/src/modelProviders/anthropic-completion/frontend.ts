import { type Completion } from "@anthropic-ai/sdk/resources";
import { type SupportedModel } from ".";
import { type FrontendModelProvider } from "../types";

const frontendModelProvider: FrontendModelProvider<SupportedModel, Completion> = {
  name: "Replicate Llama2",

  models: {
    "claude-2.0": {
      name: "Claude 2.0",
      contextWindow: 100000,
      promptTokenPrice: 11.02 / 1000000,
      completionTokenPrice: 32.68 / 1000000,
      speed: "medium",
      provider: "anthropic/completion",
      learnMoreUrl: "https://www.anthropic.com/product",
      apiDocsUrl: "https://docs.anthropic.com/claude/reference/complete_post",
    },
    "claude-instant-1.1": {
      name: "Claude Instant 1.1",
      contextWindow: 100000,
      promptTokenPrice: 1.63 / 1000000,
      completionTokenPrice: 5.51 / 1000000,
      speed: "fast",
      provider: "anthropic/completion",
      learnMoreUrl: "https://www.anthropic.com/product",
      apiDocsUrl: "https://docs.anthropic.com/claude/reference/complete_post",
    },
  },

  normalizeOutput: (output) => {
    return {
      type: "text",
      value: output.completion,
    };
  },
};

export default frontendModelProvider;
