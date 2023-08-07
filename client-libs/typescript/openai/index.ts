import * as OpenAI from "openai-beta";
import { readEnv } from "openai-beta/core";

// Anything we don't override we want to pass through to openai directly
export * as openai from "openai-beta";

interface ClientOptions extends OpenAI.ClientOptions {
  openPipeApiKey?: string;
  openPipeBaseUrl?: string;
}

export class OpenPipe extends OpenAI.OpenAI {
  openPipeApiKey: string;
  openPipeBaseUrl: string;

  constructor({
    openPipeApiKey = readEnv("OPENPIPE_API_KEY"),
    openPipeBaseUrl = readEnv("OPENPIPE_BASE_URL") ??
      `https://app.openpipe.ai/v1`,
    ...opts
  }: ClientOptions = {}) {
    if (openPipeApiKey === undefined) {
      console.error(
        "The OPENPIPE_API_KEY environment variable is missing or empty; either provide it, or instantiate the OpenPipe client with an openPipeApiKey option, like new OpenPipe({ openPipeApiKey: undefined })."
      );
    }
    super({
      ...opts,
    });
  }
}
