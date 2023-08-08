import { env } from "~/env.mjs";

import { default as OriginalOpenAI } from "openai";
import { OpenAI } from "openpipe";

const openAIConfig = { apiKey: env.OPENAI_API_KEY ?? "dummy-key" };

// Set a dummy key so it doesn't fail at build time
export const openai = env.USE_OPENPIPE
  ? new OpenAI.OpenAI(openAIConfig)
  : new OriginalOpenAI(openAIConfig);
