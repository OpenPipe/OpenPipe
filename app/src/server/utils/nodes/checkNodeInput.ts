import { type Node, type NodeType } from "@prisma/client";

import { type InferNodeConfig } from "./node.types";
import { hashNode } from "./hashNode";

// This function signature ensures the config matches the type
export const checkNodeInput = <
  T extends NodeType,
  U extends Pick<Node, "projectId"> & Record<string, unknown>,
>(
  input: U & {
    id: string;
    projectId: string;
    type: T;
    config: InferNodeConfig<T>;
  },
): U & { type: T; config: object; hash: string } => {
  const hash = hashNode(input);
  return {
    ...input,
    config: input.config as object,
    hash,
  };
};
