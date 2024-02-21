import type { JsonValue } from "type-fest";
import { type z } from "zod";

import hashObject from "../hashObject";
import { type nodeSchema, type InferNodeConfig, typedNode } from "./node.types";
import { kysely } from "~/server/db";

export const hashNode = <T extends z.infer<typeof nodeSchema>["type"]>({
  projectId,
  node,
}: {
  projectId: string;
  node: {
    type: T;
    config: InferNodeConfig<T>;
  };
}) => {
  let hashableConfig = {};
  const tNode = typedNode(node);
  if (node.type === "Monitor") {
    hashableConfig = {
      filters: tNode.config.checkFilters,
    };
  }
  if (tNode.type === "LLMRelabel") {
    hashableConfig = {
      filters: tNode.config.relabelLLM,
    };
  }
  if (tNode.type === "ManualRelabel") {
    hashableConfig = {
      nodeId: tNode.config.nodeId,
    };
  }
  return hashObject({ projectId, type: tNode.type, hashableConfig });
};

export const hashDatasetEntryInput = ({
  projectId,
  tool_choice,
  tools,
  messages,
  response_format,
}: {
  projectId: string;
  tool_choice?: string | object | null;
  tools?: object[] | null;
  messages: JsonValue;
  response_format?: JsonValue;
}) => {
  return hashObject({
    projectId,
    tool_choice: (tool_choice ?? null) as JsonValue,
    // default tools to empty array to match db
    tools: (tools ?? []) as JsonValue,
    messages,
    response_format: response_format ?? null,
  });
};

export const hashAndSaveDatasetEntryInput = async ({
  projectId,
  tool_choice,
  tools,
  messages,
  response_format,
  trx = kysely,
}: {
  projectId: string;
  tool_choice?: string | object | null;
  tools?: object[] | null;
  messages: JsonValue;
  response_format?: JsonValue;
  trx?: typeof kysely;
}) => {
  const inputHash = hashDatasetEntryInput({
    projectId,
    tool_choice,
    tools,
    messages,
    response_format,
  });

  await trx
    .insertInto("DatasetEntryInput")
    .values({
      hash: inputHash,
      tool_choice: tool_choice ? JSON.stringify(tool_choice) : undefined,
      tools: tools ? JSON.stringify(tools) : undefined,
      messages: JSON.stringify(messages),
      response_format: response_format ? JSON.stringify(response_format) : undefined,
    })
    .onConflict((oc) => oc.columns(["hash"]).doNothing())
    .execute();

  return inputHash;
};

export const hashDatasetEntryOutput = ({
  projectId,
  output,
}: {
  projectId: string;
  output: object;
}) => {
  return hashObject({
    projectId,
    output: output as JsonValue,
  });
};

export const hashAndSaveDatasetEntryOutput = async ({
  projectId,
  output,
  trx = kysely,
}: {
  projectId: string;
  output: object;
  trx?: typeof kysely;
}) => {
  const outputHash = hashDatasetEntryOutput({ projectId, output });

  await trx
    .insertInto("DatasetEntryOutput")
    .values({
      hash: outputHash,
      output: JSON.stringify(output),
    })
    .onConflict((oc) => oc.columns(["hash"]).doNothing())
    .execute();

  return outputHash;
};
