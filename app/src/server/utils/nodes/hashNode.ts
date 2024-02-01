import type { JsonValue } from "type-fest";
import { type z } from "zod";

import hashObject from "../hashObject";
import { type nodeSchema, type InferNodeConfig, typedNode } from "./node.types";

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
  tool_choice = {},
  tools = [],
  messages,
  response_format = {},
}: {
  projectId: string;
  tool_choice?: JsonValue;
  tools?: object[];
  messages: JsonValue;
  response_format?: JsonValue;
}) => {
  return hashObject({
    projectId,
    tool_choice,
    tools: tools as JsonValue,
    messages,
    response_format,
  });
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
