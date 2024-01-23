import type { NodeType } from "@prisma/client";

import hashObject from "../hashObject";

export const hashNode = ({
  projectId,
  type,
  config = {},
}: {
  projectId: string;
  type: NodeType;
  config: any;
}) => {
  let hashableConfig = config;
  if (type === "Monitor") {
    hashableConfig = {
      filters: config["checkFilters"],
    };
  }
  if (type === "LLMRelabel") {
    hashableConfig = {
      filters: config["relabelLLM"],
    };
  }
  return hashObject({ projectId, type, hashableConfig });
};
