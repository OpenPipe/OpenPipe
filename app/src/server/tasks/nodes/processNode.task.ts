import type { NodeType } from "@prisma/client";

import defineTask from "../defineTask";
import { processMonitor } from "~/server/utils/nodes/processMonitor";
import { processLLMRelabel } from "~/server/utils/nodes/processLLMRelabel";

export type ProcessNodeJob = {
  nodeId: string;
  nodeType: NodeType;
};

export const processNode = defineTask<ProcessNodeJob>({
  id: "processNode",
  handler: async (task) => {
    const { nodeId, nodeType } = task;
    if (nodeType === "Monitor") {
      await processMonitor(nodeId);
    }
    if (nodeType === "LLMRelabel") {
      await processLLMRelabel(nodeId);
    }
  },
});
