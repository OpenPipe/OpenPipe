import type { Node, NodeType } from "@prisma/client";
import type { TaskSpec } from "graphile-worker";
import type { ChatCompletionMessage } from "openai/resources";
import { from, lastValueFrom } from "rxjs";
import { mergeMap, tap } from "rxjs/operators";

import defineTask from "../../defineTask";
import { monitorProperties } from "./processMonitor";
import { llmRelabelProperties } from "./processLLMRelabel";
import { invalidateNodeEntries } from "./invalidateNodeEntries";
import { archiveProperties } from "./processArchive";
import { datasetProperties } from "./processDataset";
import { enqueueDescendants } from "./enqueueDescendants";
import { manualRelabelProperties } from "./processManualRelabel";
import { typedNode, typedNodeEntry } from "~/server/utils/nodes/node.types";
import type { NodeEntry } from "~/types/kysely-codegen.types";
import { kysely, prisma } from "~/server/db";
import { type AtLeastOne } from "~/types/shared.types";
import { type ForwardEntriesSelectionExpression, forwardNodeEntries } from "./forwardNodeEntries";
import { saveResults } from "./saveResults";
import { updateCached } from "./updateCached";
import { printNodeEntries } from "~/server/utils/nodes/utils";

export type ProcessNodeJob = {
  nodeId: string;
  invalidateData?: boolean;
};

export const processNode = defineTask<ProcessNodeJob>({
  id: "processNode",
  handler: async (task) => {
    console.log(task);

    const { nodeId, invalidateData } = task;
    if (invalidateData) {
      await invalidateNodeEntries(nodeId);
    }
    const node = await prisma.node
      .findUnique({
        where: { id: nodeId },
      })
      .then((n) => (n ? typedNode(n) : null));

    if (!node) return;

    const nodeProperties = processNodeProperties[node.type];

    // ensure that all "PROCESSING" entries are reset to "PENDING" after job restart
    await kysely
      .updateTable("NodeEntry as ne")
      .set({ status: "PENDING" })
      .where("ne.nodeId", "=", node.id)
      .where("ne.status", "=", "PROCESSING")
      .execute();

    await updateCached({ node });

    if (nodeProperties.beforeAll) {
      await nodeProperties.beforeAll(node);
    }

    const forwardAllOutputs = async () => {
      for (const output of nodeProperties.outputs) {
        await forwardNodeEntries({
          nodeId,
          nodeOutputLabel: output.label,
          selectionExpression: output.selectionExpression,
        });
      }
      await enqueueDescendants(nodeId);
    };

    await forwardAllOutputs();

    const processEntry = nodeProperties.processEntry;

    if (processEntry && nodeProperties.getConcurrency) {
      const concurrency = nodeProperties.getConcurrency(node);

      while (true) {
        await updateCached({ node });
        const entriesBatch = await kysely
          .selectFrom("NodeEntry as ne")
          .where("nodeId", "=", node.id)
          .where((eb) => eb.or([eb("ne.status", "=", "PENDING"), eb("ne.status", "=", "ERROR")]))
          .innerJoin("DatasetEntryInput as dei", "dei.hash", "ne.inputHash")
          .innerJoin("DatasetEntryOutput as deo", "deo.hash", "ne.outputHash")
          .select([
            "ne.id",
            "ne.inputHash",
            "ne.outputHash",
            "ne.originalOutputHash",
            "dei.tool_choice",
            "dei.tools",
            "dei.messages",
            "dei.response_format",
            "deo.output",
          ])
          .orderBy("ne.createdAt", "asc")
          .limit(nodeProperties.readBatchSize ?? 1000)
          .execute();

        if (!entriesBatch.length) {
          break;
        }

        let processEntryResults: ProcessEntryResult[] = [];

        const saveAndForward = async () => {
          const resultsToProcess = processEntryResults;
          processEntryResults = processEntryResults.slice(resultsToProcess.length);
          if (resultsToProcess.length) {
            await saveResults({ node, resultsToProcess });
          }
          await forwardAllOutputs();
        };

        const forwardInterval = setInterval(() => void saveAndForward(), 5000);

        const pipeline = from(entriesBatch).pipe(
          mergeMap(async (entry) => {
            try {
              await prisma.nodeEntry.update({
                where: { id: entry.id },
                data: { status: "PROCESSING", error: null },
              });
              return await processEntry({ node, entry: typedNodeEntry(entry) });
            } catch (error) {
              return {
                nodeEntryId: entry.id,
                status: "ERROR" as const,
                error: (error as Error).message,
              };
            }
          }, concurrency),
          tap((result) => {
            // Side effect: Push each result into the array as it is emitted
            processEntryResults.push(result);
          }),
        );

        await lastValueFrom(pipeline);

        clearInterval(forwardInterval);

        await saveAndForward();
      }
    } else {
      // If no processEntry function is provided, just mark all entries as PROCESSED
      let updateQuery = kysely
        .updateTable("NodeEntry as ne")
        .set({ status: "PROCESSED" })
        .where("ne.nodeId", "=", node.id)
        .where("ne.status", "=", "PENDING");

      if (nodeProperties.cacheMatchFields) {
        updateQuery = updateQuery.where((eb) =>
          eb.not(
            eb.exists(
              eb.selectFrom("CachedProcessedEntry as cpe").where((eb) => {
                const ands = [
                  eb.or([eb("cpe.nodeHash", "=", node.hash), eb("cpe.nodeId", "=", node.id)]),
                ];

                if (nodeProperties.cacheMatchFields?.includes("nodeEntryPersistentId")) {
                  ands.push(eb("ne.persistentId", "=", `cpe.nodeEntryPersistentId`));
                }
                if (nodeProperties.cacheMatchFields?.includes("incomingDEIHash")) {
                  ands.push(eb("ne.inputHash", "=", `cpe.incomingDEIHash`));
                }
                if (nodeProperties.cacheMatchFields?.includes("incomingDEOHash")) {
                  ands.push(eb("ne.outputHash", "=", `cpe.incomingDEOHash`));
                }

                return eb.and(ands);
              }),
            ),
          ),
        );
      }

      await updateQuery.execute();
    }

    if (node.type === "Archive") {
      await printNodeEntries(nodeId);
    }

    if (nodeProperties.afterAll) {
      await nodeProperties.afterAll(node);
    }

    await forwardAllOutputs();
  },
});

export const enqueueProcessNode = async (job: ProcessNodeJob, spec?: TaskSpec) => {
  await processNode.enqueue(job, { ...spec, queueName: job.nodeId });
};

export const processNodeProperties: Record<NodeType, NodeProperties> = {
  Monitor: monitorProperties,
  Archive: archiveProperties,
  Filter: llmRelabelProperties,
  LLMRelabel: llmRelabelProperties,
  ManualRelabel: manualRelabelProperties,
  Dataset: datasetProperties,
};

type CacheMatchField = "nodeEntryPersistentId" | "incomingDEIHash" | "incomingDEOHash";
type CacheWriteField =
  | "outgoingDEIHash"
  | "outgoingDEOHash"
  | "outgoingSplit"
  | "filterOutcome"
  | "explanation";
export type ProcessEntryResult =
  | {
      nodeEntryId: string;
      status: "PROCESSED";
      output?: ChatCompletionMessage;
      originalOutputHash?: string;
      incomingDEIHash: string;
      incomingDEOHash?: string;
      filterOutcome?: string;
      explanation?: string;
    }
  | {
      nodeEntryId: string;
      status: "PENDING" | "ERROR";
      error: string;
    };

export type NodeProperties = {
  cacheMatchFields?: AtLeastOne<CacheMatchField>;
  cacheWriteFields?: AtLeastOne<CacheWriteField>;
  readBatchSize?: number;
  getConcurrency?: (node: ReturnType<typeof typedNode>) => number;
  processEntry?: ({
    node,
    entry,
  }: {
    node: ReturnType<typeof typedNode> & Pick<Node, "projectId" | "hash">;
    entry: ReturnType<typeof typedNodeEntry> &
      Pick<NodeEntry, "id" | "inputHash" | "outputHash" | "originalOutputHash">;
  }) => Promise<ProcessEntryResult>;
  beforeAll?: (
    node: ReturnType<typeof typedNode> & Pick<Node, "id" | "projectId" | "hash">,
  ) => Promise<void>;
  afterAll?: (node: ReturnType<typeof typedNode> & Pick<Node, "id" | "hash">) => Promise<void>;
  outputs: {
    label: string;
    selectionExpression?: ForwardEntriesSelectionExpression;
  }[];
};
