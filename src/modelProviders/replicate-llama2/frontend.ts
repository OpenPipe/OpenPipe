import { type SupportedModel, type ReplicateLlama2Output } from ".";
import { type FrontendModelProvider } from "../types";

const frontendModelProvider: FrontendModelProvider<SupportedModel, ReplicateLlama2Output> = {
  name: "Replicate Llama2",

  models: {
    "7b-chat": {},
    "13b-chat": {},
    "70b-chat": {},
  },

  normalizeOutput: (output) => {
    return {
      type: "text",
      value: output.join(""),
    };
  },
};

export default frontendModelProvider;
