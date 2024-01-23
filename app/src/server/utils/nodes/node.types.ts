import type { Node } from "@prisma/client";
import { z } from "zod";

export enum RelabelOptions {
  GPT40613 = "gpt-4-0613",
  GPT41106 = "gpt-4-1106-preview",
  GPT432k = "gpt-4-32k",
  SkipRelabel = "skip relabeling",
}

export const relabelOptions = [
  RelabelOptions.GPT40613,
  RelabelOptions.GPT41106,
  RelabelOptions.GPT432k,
  RelabelOptions.SkipRelabel,
] as const;

export enum MonitorOutputs {
  MatchedLogs = "Matched Logs",
}

export enum LLMRelabelOutputs {
  Relabeled = "relabeled",
  Unprocessed = "unprocessed",
}

const node = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("Monitor"),
    config: z.object({
      initialFilters: z.array(z.string()),
      checkFilters: z.array(z.string()),
    }),
  }),
  z.object({
    type: z.literal("LLMRelabel"),
    config: z.object({
      relabelLLM: z.enum(relabelOptions),
    }),
  }),
]);

export const typedNode = <T extends Pick<Node, "type" | "config">>(
  input: T,
): Omit<T, "type" | "config"> & z.infer<typeof node> => node.parse(input);
