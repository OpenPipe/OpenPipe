import type { NodeEntry, Node, NodeType } from "@prisma/client";
import { type z } from "zod";

import { type ForwardEntriesSelectionExpression } from "~/server/tasks/nodes/processNodes/forwardNodeEntries";
import { type ProcessEntryResult } from "~/server/tasks/nodes/processNodes/processNode.task";
import { type AtLeastOne } from "~/types/shared.types";
import type { InferNodeConfig } from "../node.types";
import { type typedNodeEntry } from "~/types/dbColumns.types";

type CacheMatchField = "nodeEntryPersistentId" | "incomingInputHash" | "incomingOutputHash";
type CacheWriteField =
  | "outgoingInputHash"
  | "outgoingOutputHash"
  | "outgoingSplit"
  | "filterOutcome"
  | "explanation";

export type NodeProperties<T extends NodeType> = {
  schema: z.ZodObject<
    {
      type: z.ZodLiteral<T>;
      config: z.ZodObject<
        NonNullable<unknown>,
        "passthrough",
        z.ZodTypeAny,
        z.objectOutputType<NonNullable<unknown>, z.ZodTypeAny, "passthrough">
      >;
    },
    "passthrough",
    z.ZodTypeAny
  >;
  cacheMatchFields?: AtLeastOne<CacheMatchField>;
  cacheWriteFields?: AtLeastOne<CacheWriteField>;
  readBatchSize?: number;
  outputs: {
    label: string;
    selectionExpression?: ForwardEntriesSelectionExpression;
  }[];
  hashableFields?: (node: { config: InferNodeConfig<T> } & Pick<Node, "id" | "projectId">) => {
    [key: string]: unknown;
  };
  getConcurrency?: (node: { config: InferNodeConfig<T> }) => number;
  beforeInvalidating?: (
    node: { config: InferNodeConfig<T> } & Pick<Node, "id" | "projectId" | "hash">,
  ) => Promise<void>;
  beforeProcessing?: (
    node: { config: InferNodeConfig<T> } & Pick<Node, "id" | "projectId" | "hash">,
  ) => Promise<void>;
  processEntry?: ({
    node,
    entry,
  }: {
    node: { config: InferNodeConfig<T> } & Pick<Node, "projectId" | "hash">;
    entry: ReturnType<typeof typedNodeEntry> & Pick<NodeEntry, "id" | "outputHash">;
  }) => Promise<ProcessEntryResult>;
  afterProcessing?: (
    node: { config: InferNodeConfig<T> } & Pick<Node, "id" | "hash">,
  ) => Promise<void>;
  afterAll?: (node: { config: InferNodeConfig<T> } & Pick<Node, "id" | "hash">) => Promise<void>;
};
