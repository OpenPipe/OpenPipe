import fs from "fs";
import path from "path";
import openapiTS, { type OpenAPI3 } from "openapi-typescript";
import YAML from "yaml";
import { pick } from "lodash-es";
import assert from "assert";

const OPENAPI_URL =
  "https://raw.githubusercontent.com/openai/openai-openapi/0c432eb66fd0c758fd8b9bd69db41c1096e5f4db/openapi.yaml";

// Generate TypeScript types from OpenAPI

const schema = await fetch(OPENAPI_URL)
  .then((res) => res.text())
  .then((txt) => YAML.parse(txt) as OpenAPI3);

console.log(schema.components?.schemas?.CreateChatCompletionRequest);

// @ts-expect-error just assume this works, the assert will catch it if it doesn't
const modelProperty = schema.components?.schemas?.CreateChatCompletionRequest?.properties?.model;

assert(modelProperty.oneOf.length === 2, "Expected model to have oneOf length of 2");

// We need to do a bit of surgery here since the Monaco editor doesn't like
// the fact that the schema says `model` can be either a string or an enum,
// and displays a warning in the editor. Let's stick with just an enum for
// now and drop the string option.
modelProperty.type = "string";
modelProperty.enum = modelProperty.oneOf[1].enum;
modelProperty.oneOf = undefined;

delete schema["paths"];
assert(schema.components?.schemas);
schema.components.schemas = pick(schema.components?.schemas, [
  "CreateChatCompletionRequest",
  "ChatCompletionRequestMessage",
  "ChatCompletionFunctions",
  "ChatCompletionFunctionParameters",
]);
console.log(schema);

let openApiTypes = await openapiTS(schema);

// Remove the `export` from any line that starts with `export`
openApiTypes = openApiTypes.replaceAll("\nexport ", "\n");

// Get the directory of the current script
const currentDirectory = path.dirname(import.meta.url).replace("file://", "");

// Write the TypeScript types. We only want to use this in our in-app editor, so
// save as a .txt so VS Code doesn't try to auto-import definitions from it.
fs.writeFileSync(path.join(currentDirectory, "openai.types.ts.txt"), openApiTypes);
