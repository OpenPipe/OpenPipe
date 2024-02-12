import type { NodeType } from "@prisma/client";
import type { TaskSpec } from "graphile-worker";

import defineTask from "../defineTask";
import { processMonitor } from "~/server/utils/nodes/processNodes/processMonitor";
import { processLLMRelabel } from "~/server/utils/nodes/processNodes/processLLMRelabel";
import { invalidateNodeEntries } from "~/server/utils/nodes/invalidateNodeEntries";
import { processArchive } from "~/server/utils/nodes/processNodes/processArchive";
import { processDataset } from "~/server/utils/nodes/processNodes/processDataset";
import { enqueueDescendants } from "~/server/utils/nodes/processNodes/enqueueDescendants";
// import { printNodeEntries } from "~/server/utils/nodes/utils";
import { processManualRelabel } from "~/server/utils/nodes/processNodes/processManualRelabel";

export type ProcessNodeJob = {
  nodeId: string;
  nodeType: NodeType;
  invalidateData?: boolean;
};

export const processNode = defineTask<ProcessNodeJob>({
  id: "processNode",
  handler: async (task) => {
    console.log(task);
    // await printNodeEntries(task.nodeId);

    const { nodeId, nodeType, invalidateData } = task;
    if (invalidateData) {
      await invalidateNodeEntries(nodeId);
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
    if (nodeType === "ManualRelabel") {
      await processManualRelabel(nodeId);
    }
    if (nodeType === "Dataset") {
      await processDataset(nodeId);
    }
    await enqueueDescendants(nodeId);
  },
});

export const enqueueProcessNode = async (job: ProcessNodeJob, spec?: TaskSpec) => {
  await processNode.enqueue(job, { ...spec, queueName: job.nodeId });
};
