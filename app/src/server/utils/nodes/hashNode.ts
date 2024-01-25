import type { Node } from "@prisma/client";
import type { JsonValue } from "type-fest";

import hashObject from "../hashObject";
import { typedNode } from "./node.types";

export const hashNode = ({
  projectId,
  node,
}: {
  projectId: string;
  node: Pick<Node, "type" | "config">;
}) => {
  const tNode = typedNode(node);
  let hashableConfig = {};
  if (tNode.type === "Monitor") {
    hashableConfig = {
      filters: tNode.config.checkFilters,
    };
  }
  if (tNode.type === "LLMRelabel") {
    hashableConfig = {
      filters: tNode.config.relabelLLM,
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
  function_call?: JsonValue;
  functions?: object[];
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
