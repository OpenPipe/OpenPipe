import type { NodeType } from "@prisma/client";

import defineTask from "../defineTask";
import { processMonitor } from "~/server/utils/nodes/processNodes/processMonitor";
import { processLLMRelabel } from "~/server/utils/nodes/processNodes/processLLMRelabel";
import { invalidateNodeData } from "~/server/utils/nodes/invalidateNodeData";
import { processArchive } from "~/server/utils/nodes/processNodes/processArchive";
import { processDataset } from "~/server/utils/nodes/processNodes/processDataset";
import { enqueueDescendants } from "~/server/utils/nodes/processNodes/enqueueDescendants";

export type ProcessNodeJob = {
  nodeId: string;
  nodeType: NodeType;
  invalidateData?: boolean;
};

export const processNode = defineTask<ProcessNodeJob>({
  id: "processNode",
  handler: async (task) => {
    const { nodeId, nodeType, invalidateData } = task;
    if (invalidateData) {
      await invalidateNodeData(nodeId);
    }
    if (nodeType === "Archive") {
      await processArchive(nodeId);
    }
    if (nodeType === "Monitor") {
      await processMonitor(nodeId);
    }
    if (nodeType === "LLMRelabel") {
      await processLLMRelabel(nodeId);
    }
    if (nodeType === "Dataset") {
      await processDataset(nodeId);
    }
    await enqueueDescendants(nodeId);
  },
});
