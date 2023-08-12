import { type ClientOptions, default as OriginalOpenAI } from "openai";
import fs from "fs";
import path from "path";

import { env } from "~/env.mjs";

// TODO: use local dependency
// import { OpenAI } from "openpipe";

let config: ClientOptions;

try {
  // Allow developers to override the config with a local file
  const jsonData = fs.readFileSync(
    path.join(path.dirname(import.meta.url).replace("file://", ""), "./openaiCustomConfig.json"),
    "utf8",
  );
  config = JSON.parse(jsonData.toString());
} catch (error) {
  // Set a dummy key so it doesn't fail at build time
  config = { apiKey: env.OPENAI_API_KEY ?? "dummy-key" };
}

// export const openai = env.OPENPIPE_API_KEY ? new OpenAI.OpenAI(config) : new OriginalOpenAI(config);

export const openai = new OriginalOpenAI(config);
