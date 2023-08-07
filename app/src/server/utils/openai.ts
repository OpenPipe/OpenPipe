import { env } from "~/env.mjs";

// import OpenAI from "openai";

// import { OpenPipe } from "../../../../client-libs/js/openai/index";

import { OpenAI } from "openpipe";

// Set a dummy key so it doesn't fail at build time
export const openai = new OpenAI.OpenPipe({ apiKey: env.OPENAI_API_KEY ?? "dummy-key" });
