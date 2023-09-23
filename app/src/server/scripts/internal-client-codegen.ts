import "dotenv/config";
import { openApiDocument } from "~/pages/api/internal/v1/openapi.json";
import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const scriptPath = import.meta.url.replace("file://", "");
const dockerClientPath = path.join(path.dirname(scriptPath), "../../../../trainer");

const schemaPath = path.join(dockerClientPath, "openapi.json");

console.log(`Exporting internal OpenAPI schema to ${schemaPath}`);

fs.writeFileSync(schemaPath, JSON.stringify(openApiDocument, null, 2), "utf-8");

console.log("Generating Python client");

execSync(path.join(dockerClientPath, "openapi-codegen.sh"));

console.log("Done!");
