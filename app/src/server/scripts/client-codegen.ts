import "dotenv/config";
import { openApiDocument } from "~/pages/api/openapi.json";
import fs from "fs";
import path from "path";
import { execSync } from "child_process";

console.log("Exporting public OpenAPI schema to client-libs/schema.json");

const scriptPath = import.meta.url.replace("file://", "");
const clientLibsPath = path.join(path.dirname(scriptPath), "../../../../client-libs");

const schemaPath = path.join(
  clientLibsPath,
  "schema.json"
);

console.log("Exporting schema");
fs.writeFileSync(schemaPath, JSON.stringify(openApiDocument, null, 2), "utf-8");

console.log("Generating Typescript client");

const tsClientPath = path.join(
  clientLibsPath,
  "js/codegen"
);

fs.rmSync(tsClientPath, { recursive: true, force: true });

execSync(
  `pnpm dlx @openapitools/openapi-generator-cli generate -i "${schemaPath}" -g typescript-axios -o "${tsClientPath}"`,
  {
    stdio: "inherit",
  }
);

console.log("Done!");

process.exit(0);
