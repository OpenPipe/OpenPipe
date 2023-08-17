import { type OpenpipeChatOutput, type SupportedModel } from ".";
import { type FrontendModelProvider } from "../types";
import { refinementActions } from "./refinementActions";
import { templateOpenOrcaPrompt } from "./templatePrompt";

const frontendModelProvider: FrontendModelProvider<SupportedModel, OpenpipeChatOutput> = {
  name: "OpenAI ChatCompletion",

  models: {
    "Open-Orca/OpenOrcaxOpenChat-Preview2-13B": {
      name: "OpenOrca-Platypus2-13B",
      contextWindow: 4096,
      pricePerSecond: 0.0003,
      speed: "medium",
      provider: "openpipe/Chat",
      learnMoreUrl: "https://huggingface.co/Open-Orca/OpenOrcaxOpenChat-Preview2-13B",
      templatePrompt: templateOpenOrcaPrompt,
    },
  },

  refinementActions,

  normalizeOutput: (output) => ({ type: "text", value: output }),
};

export default frontendModelProvider;
