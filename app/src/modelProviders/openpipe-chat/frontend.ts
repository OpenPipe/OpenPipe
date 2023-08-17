import { type OpenpipeChatOutput, type SupportedModel } from ".";
import { type FrontendModelProvider } from "../types";
import { refinementActions } from "./refinementActions";
import {
  templateOpenOrcaPrompt,
  //   templateAlpacaInstructPrompt,
  //   templateSystemUserAssistantPrompt,
  templateInstructionInputResponsePrompt,
  templateAiroborosPrompt,
} from "./templatePrompt";

const frontendModelProvider: FrontendModelProvider<SupportedModel, OpenpipeChatOutput> = {
  name: "OpenAI ChatCompletion",

  models: {
    "Open-Orca/OpenOrcaxOpenChat-Preview2-13B": {
      name: "OpenOrcaxOpenChat-Preview2-13B",
      contextWindow: 4096,
      pricePerSecond: 0.0003,
      speed: "medium",
      provider: "openpipe/Chat",
      learnMoreUrl: "https://huggingface.co/Open-Orca/OpenOrcaxOpenChat-Preview2-13B",
      templatePrompt: templateOpenOrcaPrompt,
    },
    // "Open-Orca/OpenOrca-Platypus2-13B": {
    //   name: "OpenOrca-Platypus2-13B",
    //   contextWindow: 4096,
    //   pricePerSecond: 0.0003,
    //   speed: "medium",
    //   provider: "openpipe/Chat",
    //   learnMoreUrl: "https://huggingface.co/Open-Orca/OpenOrca-Platypus2-13B",
    //   templatePrompt: templateAlpacaInstructPrompt,
    // },
    // "stabilityai/StableBeluga-13B": {
    //   name: "StableBeluga-13B",
    //   contextWindow: 4096,
    //   pricePerSecond: 0.0003,
    //   speed: "medium",
    //   provider: "openpipe/Chat",
    //   learnMoreUrl: "https://huggingface.co/stabilityai/StableBeluga-13B",
    //   templatePrompt: templateSystemUserAssistantPrompt,
    // },
    "NousResearch/Nous-Hermes-Llama2-13b": {
      name: "Nous-Hermes-Llama2-13b",
      contextWindow: 4096,
      pricePerSecond: 0.0003,
      speed: "medium",
      provider: "openpipe/Chat",
      learnMoreUrl: "https://huggingface.co/NousResearch/Nous-Hermes-Llama2-13b",
      templatePrompt: templateInstructionInputResponsePrompt,
    },
    "jondurbin/airoboros-l2-13b-gpt4-2.0": {
      name: "airoboros-l2-13b-gpt4-2.0",
      contextWindow: 4096,
      pricePerSecond: 0.0003,
      speed: "medium",
      provider: "openpipe/Chat",
      learnMoreUrl: "https://huggingface.co/jondurbin/airoboros-l2-13b-gpt4-2.0",
      templatePrompt: templateAiroborosPrompt,
    },
  },

  refinementActions,

  normalizeOutput: (output) => ({ type: "text", value: output }),
};

export default frontendModelProvider;
