import "dotenv/config";
import path from "path";
import { generate } from "openapi-typescript-codegen";
import fs from "fs/promises";
import { $ } from "execa";

const $$ = $({ stdio: "inherit", shell: true });

const scriptPath = import.meta.url.replace("file://", "");
const clientLibsPath = path.dirname(scriptPath);

await fs.rm(path.join(clientLibsPath, "trainerV1"), { recursive: true, force: true });

try {
  const spec = await fetch(`https://openpipe-dev--trainer-v1.modal.run/openapi.json`);

  await generate({
    input: await spec.json(),
    output: path.join(clientLibsPath, "trainerV1"),
    clientName: "TrainerV1",
    httpClient: "fetch",
  });
  console.log("Succeeded in generating TrainerV1");
} catch (e) {
  console.log("Error generating TrainerV1");
  console.error(e);
}

try {
  await fs.rm(path.join(clientLibsPath, "loraInferenceV1"), { recursive: true, force: true });

  await generate({
    input: `https://openpipe-dev--lora-inference-v1.modal.run/openapi.json`,
    output: path.join(clientLibsPath, "loraInferenceV1"),
    clientName: "LoraInferenceV1",
    httpClient: "fetch",
  });

  console.log("Succeeded in generating LoraInferenceV1");
} catch (e) {
  console.log("Error generating LoraInferenceV1 client");
  console.error(e);
}

$$`prettier --write ${clientLibsPath}`;
