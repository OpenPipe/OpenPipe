import type { NodeType } from "@prisma/client";
import type { JsonValue } from "type-fest";

import hashObject from "../hashObject";
import { type InferNodeConfig } from "./node.types";
import { kysely } from "~/server/db";
import { nodePropertiesByType } from "~/server/tasks/nodes/processNodes/processNode.task";
import { type NodeProperties } from "./nodeProperties/nodeProperties.types";
import type { ChatCompletionCreateParams, ChatCompletionMessage } from "openai/resources";

export const hashNode = <T extends NodeType>(node: {
  id: string;
  projectId: string;
  type: T;
  config: InferNodeConfig<T>;
}) => {
  let hashableFields = {};

  const nodeProperties = nodePropertiesByType[node.type] as NodeProperties<T>;

  if (nodeProperties.hashableFields) {
    hashableFields = nodeProperties.hashableFields(node);
  }

  return hashObject({ projectId: node.projectId, type: node.type, hashableFields });
};

export const hashDatasetEntryInput = ({
  projectId,
  tool_choice,
  tools,
  messages,
  response_format,
}: {
  projectId: string;
} & Pick<ChatCompletionCreateParams, "tool_choice" | "tools" | "messages" | "response_format">) => {
  return hashObject({
    projectId,
    tool_choice: (tool_choice ?? null) as JsonValue,
    // default tools to empty array to match db
    tools: (tools ?? []) as unknown as JsonValue,
    messages: messages as unknown as JsonValue[],
    response_format: (response_format as JsonValue) ?? null,
  });
};

export const hashAndSaveDatasetEntryInput = async ({
  projectId,
  tool_choice,
  tools,
  messages,
  response_format,
  inputTokens,
  trx = kysely,
}: {
  projectId: string;
  inputTokens?: number;
  trx?: typeof kysely;
} & Pick<ChatCompletionCreateParams, "tool_choice" | "tools" | "messages" | "response_format">) => {
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
      projectId,
      hash: inputHash,
      tool_choice: tool_choice ? JSON.stringify(tool_choice) : undefined,
      tools: tools ? JSON.stringify(tools) : undefined,
      messages: JSON.stringify(messages),
      response_format: response_format ? JSON.stringify(response_format) : undefined,
      inputTokens,
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
  output: ChatCompletionMessage;
}) => {
  return hashObject({
    projectId,
    output: output as unknown as JsonValue,
  });
};

export const hashAndSaveDatasetEntryOutput = async ({
  projectId,
  output,
  outputTokens,
  trx = kysely,
}: {
  projectId: string;
  output: ChatCompletionMessage;
  outputTokens?: number;
  trx?: typeof kysely;
}) => {
  const outputHash = hashDatasetEntryOutput({ projectId, output });

  await trx
    .insertInto("DatasetEntryOutput")
    .values({
      projectId,
      hash: outputHash,
      output: JSON.stringify(output),
      outputTokens,
    })
    .onConflict((oc) => oc.columns(["hash"]).doNothing())
    .execute();

  return outputHash;
};
