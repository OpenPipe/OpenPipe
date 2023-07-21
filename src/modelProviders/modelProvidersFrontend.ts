import openaiChatCompletionFrontend from "./openai-ChatCompletion/frontend";
import replicateLlama2Frontend from "./replicate-llama2/frontend";
import { type SupportedProvider, type ModelProviderFrontend } from "./types";

// TODO: make sure we get a typescript error if you forget to add a provider here

// Keep attributes here that need to be accessible from the frontend. We can't
// just include them in the default `modelProviders` object because it has some
// transient dependencies that can only be imported on the server.
const modelProvidersFrontend: Record<SupportedProvider, ModelProviderFrontend<any>> = {
  "openai/ChatCompletion": openaiChatCompletionFrontend,
  "replicate/llama2": replicateLlama2Frontend,
};

export default modelProvidersFrontend;
