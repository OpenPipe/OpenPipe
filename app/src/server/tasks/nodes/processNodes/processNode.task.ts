import type { NodeType } from "@prisma/client";
import type { TaskSpec } from "graphile-worker";
import type { ChatCompletionMessage } from "openai/resources";
import { from, lastValueFrom } from "rxjs";
import { mergeMap, tap } from "rxjs/operators";

import defineTask from "../../defineTask";
import { monitorProperties } from "../../../utils/nodes/nodeProperties/monitorProperties";
import { llmRelabelProperties } from "../../../utils/nodes/nodeProperties/llmRelabelProperties";
import { invalidateNodeEntries } from "./invalidateNodeEntries";
import { archiveProperties } from "../../../utils/nodes/nodeProperties/archiveProperties";
import { datasetProperties } from "../../../utils/nodes/nodeProperties/datasetProperties";
import { enqueueDescendants } from "./enqueueDescendants";
import { manualRelabelProperties } from "../../../utils/nodes/nodeProperties/manualRelabelProperties";
import { typedNode } from "~/server/utils/nodes/node.types";
import { kysely, prisma } from "~/server/db";
import { forwardNodeEntries } from "./forwardNodeEntries";
import { saveResults, type SaveableProcessEntryResult } from "./saveResults";
import { updateCached } from "./updateCached";
import { type NodeProperties } from "~/server/utils/nodes/nodeProperties/nodeProperties.types";
import { filterProperties } from "~/server/utils/nodes/nodeProperties/filterProperties";
import { typedNodeEntry } from "~/types/dbColumns.types";

const fetchNode = async ({ id }: { id: string }) =>
  prisma.node
    .findUnique({
      where: { id },
    })
    .then((n) => (n ? typedNode(n) : null));

export type ProcessNodeJob = {
  nodeId: string;
};

export const processNode = defineTask<ProcessNodeJob>({
  id: "processNode",
  handler: async (task) => {
    const { nodeId } = task;

    const originalNode = await fetchNode({ id: nodeId });
    if (!originalNode) return;

    console.log({ nodeId, type: originalNode.type });

    const nodeProperties = nodePropertiesByType[originalNode.type] as NodeProperties<NodeType>;

    if (originalNode.stale) {
      console.log(`Invalidating ${originalNode.type}`);
      await nodeProperties.beforeInvalidating?.(originalNode);
      await invalidateNodeEntries(nodeId);
      await prisma.node.update({
        where: { id: nodeId },
        data: { stale: false },
      });
    }

    // refetch the node in case it was updated during the beforeInvalidating step
    const node = await fetchNode(originalNode);
    if (!node) return;

    // ensure that all "PROCESSING" and "ERROR" entries are reset to "PENDING" after job restart
    await kysely
      .updateTable("NodeEntry as ne")
      .set({ status: "PENDING" })
      .from("DataChannel as dc")
      .where("dc.destinationId", "=", node.id)
      .whereRef("ne.dataChannelId", "=", "dc.id")
      .where((eb) => eb.or([eb("ne.status", "=", "PROCESSING"), eb("ne.status", "=", "ERROR")]))
      .execute();

    await updateCached({ node });

    if (nodeProperties.beforeProcessing) {
      await nodeProperties.beforeProcessing(node);
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
          .innerJoin("DataChannel as dc", (join) =>
            join.onRef("dc.id", "=", "ne.dataChannelId").on("dc.destinationId", "=", node.id),
          )
          .where("ne.status", "=", "PENDING")
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

        let processEntryResults: SaveableProcessEntryResult[] = [];

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
              const result = await processEntry({ node, entry: typedNodeEntry(entry) });
              return {
                ...result,
                nodeEntryId: entry.id,
                incomingInputHash: entry.inputHash,
                incomingOutputHash: entry.outputHash,
              };
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
        .from("DataChannel as dc")
        .where("dc.destinationId", "=", node.id)
        .whereRef("ne.dataChannelId", "=", "dc.id")
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
                if (nodeProperties.cacheMatchFields?.includes("incomingInputHash")) {
                  ands.push(eb("ne.inputHash", "=", `cpe.incomingInputHash`));
                }
                if (nodeProperties.cacheMatchFields?.includes("incomingOutputHash")) {
                  ands.push(eb("ne.outputHash", "=", `cpe.incomingOutputHash`));
                }

                return eb.and(ands);
              }),
            ),
          ),
        );
      }

      await updateQuery.execute();
    }

    if (nodeProperties.afterProcessing) {
      await nodeProperties.afterProcessing(node);
    }

    await forwardAllOutputs();

    if (nodeProperties.afterAll) {
      await nodeProperties.afterAll(node);
    }
  },
});

export const enqueueProcessNode = async (
  job: ProcessNodeJob & { invalidateData?: boolean },
  spec?: TaskSpec,
) => {
  if (job.invalidateData) {
    await prisma.node.update({
      where: { id: job.nodeId },
      data: { stale: true },
    });
  }
  await processNode.enqueue(job, { ...spec, queueName: job.nodeId, jobKey: job.nodeId });
};

export const nodePropertiesByType = {
  Monitor: monitorProperties,
  Archive: archiveProperties,
  Filter: filterProperties,
  LLMRelabel: llmRelabelProperties,
  ManualRelabel: manualRelabelProperties,
  Dataset: datasetProperties,
};

export type SuccessProcessEntryResult = {
  status: "PROCESSED";
  output?: ChatCompletionMessage;
  originalOutputHash?: string;
  filterOutcome?: string;
  explanation?: string;
};

export type ErrorProcessEntryResult = {
  status: "PENDING" | "ERROR";
  error: string;
};

export type ProcessEntryResult = SuccessProcessEntryResult | ErrorProcessEntryResult;
