import "dotenv/config";
import { openApiDocument } from "~/pages/api/v1/openapi.json";
import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { generate } from "openapi-typescript-codegen";

const scriptPath = import.meta.url.replace("file://", "");
const clientLibsPath = path.join(path.dirname(scriptPath), "../../client-libs");

const docsSchemaPath = path.join(path.dirname(scriptPath), "../../docs/openapi.json");

console.log(`Exporting public OpenAPI schema to ${docsSchemaPath}`);

fs.writeFileSync(docsSchemaPath, JSON.stringify(openApiDocument, null, 2), "utf-8");

console.log("Generating TypeScript client");

const tsClientPath = path.join(clientLibsPath, "typescript/src/codegen");

fs.rmSync(tsClientPath, { recursive: true, force: true });
fs.mkdirSync(tsClientPath, { recursive: true });

await generate({
  input: openApiDocument,
  output: tsClientPath,
  clientName: "OPClient",
  httpClient: "node",
});

execSync(`cp ${docsSchemaPath} ${clientLibsPath}/fern/openapi/openapi.json`, { stdio: "inherit" });

console.log("Generating Python client");
execSync(`cd ${clientLibsPath} && pnpm fern generate`, { stdio: "inherit" });

console.log("Done!");
