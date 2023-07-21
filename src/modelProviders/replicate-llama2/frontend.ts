import { type ReplicateLlama2Provider } from ".";
import { type ModelProviderFrontend } from "../types";

const modelProviderFrontend: ModelProviderFrontend<ReplicateLlama2Provider> = {
  normalizeOutput: (output) => {
    return {
      type: "text",
      value: output.join(""),
    };
  },
};

export default modelProviderFrontend;
