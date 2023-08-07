import { env } from "~/env.mjs";

// import OpenAI from "openai";
import { OpenAI } from "openpipe";

// Set a dummy key so it doesn't fail at build time
export const openai = new OpenAI.OpenAI({ apiKey: env.OPENAI_API_KEY ?? "dummy-key" });
