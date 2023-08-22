import openaiChatCompletionFrontend from "./openai-ChatCompletion/frontend";
import replicateLlama2Frontend from "./replicate-llama2/frontend";
import anthropicFrontend from "./anthropic-completion/frontend";
import openpipeFrontend from "./openpipe-chat/frontend";
import { type SupportedProvider, type FrontendModelProvider } from "./types";

// Keep attributes here that need to be accessible from the frontend. We can't
// just include them in the default `modelProviders` object because it has some
// transient dependencies that can only be imported on the server.
const frontendModelProviders: Record<SupportedProvider, FrontendModelProvider<any, any>> = {
  "openai/ChatCompletion": openaiChatCompletionFrontend,
  "replicate/llama2": replicateLlama2Frontend,
  "anthropic/completion": anthropicFrontend,
  "openpipe/Chat": openpipeFrontend,
};

export default frontendModelProviders;
