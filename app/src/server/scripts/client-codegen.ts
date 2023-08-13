import "dotenv/config";
import { openApiDocument } from "~/pages/api/openapi.json";
import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const scriptPath = import.meta.url.replace("file://", "");
const clientLibsPath = path.join(path.dirname(scriptPath), "../../../../client-libs");

const schemaPath = path.join(clientLibsPath, "openapi.json");

console.log(`Exporting public OpenAPI schema to ${schemaPath}`);

fs.writeFileSync(schemaPath, JSON.stringify(openApiDocument, null, 2), "utf-8");

console.log("Generating TypeScript client");

const tsClientPath = path.join(clientLibsPath, "typescript/src/codegen");

fs.rmSync(tsClientPath, { recursive: true, force: true });

execSync(
  `pnpm dlx @openapitools/openapi-generator-cli generate -i "${schemaPath}" -g typescript-axios -o "${tsClientPath}"`,
  {
    stdio: "inherit",
  },
);

console.log("Generating Python client");

execSync(path.join(clientLibsPath, "python/codegen.sh"));

console.log("Done!");
