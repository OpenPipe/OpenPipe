import { type Node } from "@prisma/client";
import { type z } from "zod";

import { type nodeSchema, type InferNodeConfig } from "./node.types";
import { hashNode } from "./hashNode";

// This function signature should ensure the config matches the type
export const checkNodeInput = <
  T extends z.infer<typeof nodeSchema>["type"],
  U extends Pick<Node, "projectId"> & Record<string, unknown>,
>(
  input: U & {
    type: T;
    config: InferNodeConfig<T>;
  },
): U & { type: T; config: object; hash: string } => {
  const hash = hashNode({
    projectId: input.projectId,
    node: input,
  });
  return {
    ...input,
    config: input.config as object,
    hash,
  };
};
