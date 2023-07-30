import "dotenv/config";
import { openApiDocument } from "~/pages/api/openapi.json";
import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { generatePromptTypes } from "~/modelProviders/generatePromptTypes";

console.log("Exporting public OpenAPI schema to client-libs/schema.json");

const executionDir = import.meta.url.replace("file://", "");
const schemaPath = path.join(
  path.dirname(executionDir),
  "../../../client-libs/schema.json"
);

console.log("Exporting schema");
fs.writeFileSync(schemaPath, JSON.stringify(openApiDocument, null, 2), "utf-8");

console.log("Generating Typescript client");

const tsClientPath = path.join(
  path.dirname(executionDir),
  "../../../client-libs/js/codegen"
);

fs.rmSync(tsClientPath, { recursive: true, force: true });

execSync(
  `pnpm dlx @openapitools/openapi-generator-cli generate -i "${schemaPath}" -g typescript-axios -o "${tsClientPath}"`,
  {
    stdio: "inherit",
  }
);

const promptTypes = await generatePromptTypes();

const promptTypesPath = path.join(tsClientPath, "promptTypes.ts");

console.log(`Writing promptTypes to ${promptTypesPath}`);
fs.writeFileSync(promptTypesPath, promptTypes, "utf-8");

console.log("Done!");
