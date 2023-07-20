/* eslint-disable @typescript-eslint/no-var-requires */

import YAML from "yaml";
import fs from "fs";
import path from "path";
import { openapiSchemaToJsonSchema } from "@openapi-contrib/openapi-schema-to-json-schema";
import $RefParser from "@apidevtools/json-schema-ref-parser";
import { type JSONObject } from "superjson/dist/types";
import assert from "assert";
import { type JSONSchema4Object } from "json-schema";
import { isObject } from "lodash-es";

// @ts-expect-error for some reason missing from types
import parserEstree from "prettier/plugins/estree";
import parserBabel from "prettier/plugins/babel";
import prettier from "prettier/standalone";

const OPENAPI_URL =
  "https://raw.githubusercontent.com/openai/openai-openapi/0c432eb66fd0c758fd8b9bd69db41c1096e5f4db/openapi.yaml";

// Fetch the openapi document
const response = await fetch(OPENAPI_URL);
const openApiYaml = await response.text();

// Parse the yaml document
let schema = YAML.parse(openApiYaml) as JSONObject;
schema = openapiSchemaToJsonSchema(schema);

const jsonSchema = await $RefParser.dereference(schema);

assert("components" in jsonSchema);
const completionRequestSchema = jsonSchema.components.schemas
  .CreateChatCompletionRequest as JSONSchema4Object;

// We need to do a bit of surgery here since the Monaco editor doesn't like
// the fact that the schema says `model` can be either a string or an enum,
// and displays a warning in the editor. Let's stick with just an enum for
// now and drop the string option.
assert(
  "properties" in completionRequestSchema &&
    isObject(completionRequestSchema.properties) &&
    "model" in completionRequestSchema.properties &&
    isObject(completionRequestSchema.properties.model),
);

const modelProperty = completionRequestSchema.properties.model;
assert(
  "oneOf" in modelProperty &&
    Array.isArray(modelProperty.oneOf) &&
    modelProperty.oneOf.length === 2 &&
    isObject(modelProperty.oneOf[1]) &&
    "enum" in modelProperty.oneOf[1],
  "Expected model to have oneOf length of 2",
);
modelProperty.type = "string";
modelProperty.enum = modelProperty.oneOf[1].enum;
delete modelProperty["oneOf"];

// Get the directory of the current script
const currentDirectory = path.dirname(import.meta.url).replace("file://", "");

// Write the JSON schema to a file in the current directory
fs.writeFileSync(
  path.join(currentDirectory, "input.schema.json"),
  await prettier.format(JSON.stringify(completionRequestSchema, null, 2), {
    parser: "json",
    plugins: [parserBabel, parserEstree],
  }),
);
