import "dotenv/config";
import path from "path";
import { generate } from "openapi-typescript-codegen";
import fs from "fs/promises";

const scriptPath = import.meta.url.replace("file://", "");
const clientLibsPath = path.dirname(scriptPath);

await fs.rm(path.join(clientLibsPath, "trainerV1"), { recursive: true, force: true });

const spec = await fetch(`https://openpipe-dev--trainer-v1-dev.modal.run/openapi.json`);

await generate({
  input: await spec.json(),
  output: path.join(clientLibsPath, "trainerV1"),
  clientName: "TrainerV1",
  httpClient: "fetch",
});

// Not using this yet because the generated types aren't great. Need to switch to FastAPI like we did for the trainer.

// await fs.rm(path.join(clientLibsPath, "inferenceV1"), { recursive: true, force: true });

// await generate({
//   input: `https://openpipe-dev--inference-server-v1-dev.modal.run/openapi.json`,
//   output: path.join(clientLibsPath, "inferenceV1"),
//   clientName: "InferenceV1",
//   httpClient: "node",
// });

// console.log("Done!");
