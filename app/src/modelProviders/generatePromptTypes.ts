import { type JSONSchema4Object } from "json-schema";
import modelProviders from "./modelProviders";
import { compile } from "json-schema-to-typescript";
import dedent from "dedent";

export const declarePromptTypes = async () => {
  const promptTypes = (await generatePromptTypes()).replace(
    /export interface PromptTypes/g,
    "interface PromptTypes",
  );

  return dedent`
    ${promptTypes}
  
    declare function definePrompt<T extends keyof PromptTypes>(modelProvider: T, input: PromptTypes[T])
    `;
};

export const generatePromptTypes = async () => {
  const combinedSchema = {
    type: "object",
    properties: {} as Record<string, JSONSchema4Object>,
  };

  Object.entries(modelProviders).forEach(([id, provider]) => {
    combinedSchema.properties[id] = provider.inputSchema;
  });

  Object.entries(modelProviders).forEach(([id, provider]) => {
    combinedSchema.properties[id] = provider.inputSchema;
  });

  return await compile(combinedSchema as JSONSchema4Object, "PromptTypes", {
    additionalProperties: false,
    bannerComment: dedent`
  /**
   * This type map defines the input types for each model provider. 
   */ 
  `,
  });
};
