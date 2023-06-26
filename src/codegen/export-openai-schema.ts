import YAML from "yaml";
import fs from "fs";
import path from "path";
import { openapiSchemaToJsonSchema } from "@openapi-contrib/openapi-schema-to-json-schema";
import assert from "assert";

const OPENAPI_URL =
  "https://raw.githubusercontent.com/openai/openai-openapi/0c432eb66fd0c758fd8b9bd69db41c1096e5f4db/openapi.yaml";

const convertOpenApiToJsonSchema = async (url: string) => {
  // Fetch the openapi document
  const response = await fetch(url);
  const openApiYaml = await response.text();

  // Parse the yaml document
  const openApiDocument = YAML.parse(openApiYaml) as unknown;

  // Convert the openapi schema to json schema
  const jsonSchema = openapiSchemaToJsonSchema(openApiDocument);

  const modelProperty = jsonSchema.components.schemas.CreateChatCompletionRequest.properties.model;

  assert(modelProperty.oneOf.length === 2, "Expected model to have oneOf length of 2");

  // We need to do a bit of surgery here since the Monaco editor doesn't like
  // the fact that the schema says `model` can be either a string or an enum,
  // and displays a warning in the editor. Let's stick with just an enum for
  // now and drop the string option.
  modelProperty.type = "string";
  modelProperty.enum = modelProperty.oneOf[1].enum;
  modelProperty.oneOf = undefined;

  // Get the directory of the current script
  const currentDirectory = path.dirname(import.meta.url).replace("file://", "");

  // Write the JSON schema to a file in the current directory
  fs.writeFileSync(
    path.join(currentDirectory, "openai.schema.json"),
    JSON.stringify(jsonSchema, null, 2)
  );
};

convertOpenApiToJsonSchema(OPENAPI_URL)
  .then(() => console.log("JSON schema has been written successfully."))
  .catch((err) => console.error(err));
