import modelProviderFrontend from "./openai-ChatCompletion/frontend";

// Keep attributes here that need to be accessible from the frontend. We can't
// just include them in the default `modelProviders` object because it has some
// transient dependencies that can only be imported on the server.
const modelProvidersFrontend = {
  "openai/ChatCompletion": modelProviderFrontend,
} as const;

export default modelProvidersFrontend;
