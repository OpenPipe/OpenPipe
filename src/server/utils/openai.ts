import { env } from "~/env.mjs";

import OpenAI from "openai";

export const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY ?? "" });
