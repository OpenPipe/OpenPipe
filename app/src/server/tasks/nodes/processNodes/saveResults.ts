import type { Node, Prisma } from "@prisma/client";

import {
  ErrorProcessEntryResult,
  SuccessProcessEntryResult,
  processNodeProperties,
} from "./processNode.task";
import { hashDatasetEntryOutput } from "~/server/utils/nodes/hashNode";
import { countDatasetEntryTokens } from "../../fineTuning/countDatasetEntryTokens.task";
import { type typedNode } from "~/server/utils/nodes/node.types";
import { prisma } from "~/server/db";

export type SaveableProcessEntryResult =
  | (SuccessProcessEntryResult & {
      nodeEntryId: string;
      incomingInputHash: string;
      incomingOutputHash: string;
    })
  | (ErrorProcessEntryResult & {
      nodeEntryId: string;
    });

export const saveResults = async ({
  node,
  resultsToProcess,
}: {
  node: ReturnType<typeof typedNode> & Pick<Node, "projectId" | "hash">;
  resultsToProcess: SaveableProcessEntryResult[];
}) => {
  const outputsToCreate: Prisma.DatasetEntryOutputCreateManyInput[] = [];
  const cachedProcessedEntriesToCreate: Prisma.CachedProcessedEntryCreateManyInput[] = [];
  const nodeEntriesToUpdate: Prisma.NodeEntryUpdateArgs[] = [];

  const nodeProperties = processNodeProperties[node.type];

  for (const result of resultsToProcess) {
    if (result.status === "PROCESSED") {
      let outputHash;
      if (result.output) {
        outputHash = hashDatasetEntryOutput({
          projectId: node.projectId,
          output: result.output,
        });
        outputsToCreate.push({
          hash: outputHash,
          output: result.output as unknown as Prisma.InputJsonValue,
        });
      }

      nodeEntriesToUpdate.push({
        where: { id: result.nodeEntryId },
        data: {
          status: "PROCESSED",
          outputHash: outputHash ? outputHash : undefined,
          originalOutputHash: result.originalOutputHash ? result.originalOutputHash : undefined,
        },
      });

      const cachedProcessedEntryToCreate: Prisma.CachedProcessedEntryCreateManyInput = {
        nodeHash: node.hash,
        incomingInputHash: result.incomingInputHash,
      };
      if (nodeProperties.cacheMatchFields?.includes("incomingOutputHash")) {
        if (!result.incomingOutputHash) throw new Error("incomingOutputHash is required");
        cachedProcessedEntryToCreate.incomingOutputHash = result.incomingOutputHash;
      }
      if (nodeProperties.cacheWriteFields?.includes("outgoingOutputHash")) {
        if (!outputHash) throw new Error("outputHash is required");
        cachedProcessedEntryToCreate.outgoingOutputHash = outputHash;
      }
      if (nodeProperties.cacheWriteFields?.includes("filterOutcome")) {
        if (!result.filterOutcome) throw new Error("filterOutcome is required");
        cachedProcessedEntryToCreate.filterOutcome = result.filterOutcome;
      }
      if (nodeProperties.cacheWriteFields?.includes("explanation")) {
        if (!result.explanation) throw new Error("explanation is required");
        cachedProcessedEntryToCreate.explanation = result.explanation;
      }
      cachedProcessedEntriesToCreate.push(cachedProcessedEntryToCreate);
    }
    if (result.status === "PENDING" || result.status === "ERROR") {
      nodeEntriesToUpdate.push({
        where: { id: result.nodeEntryId },
        data: { status: result.status, error: result.error },
      });
    }
  }

  const transactionArgs = [];

  if (outputsToCreate.length) {
    transactionArgs.push(
      prisma.datasetEntryOutput.createMany({
        data: outputsToCreate,
        skipDuplicates: true,
      }),
    );
  }
  if (cachedProcessedEntriesToCreate.length) {
    transactionArgs.push(
      prisma.cachedProcessedEntry.createMany({
        data: cachedProcessedEntriesToCreate,
        skipDuplicates: true,
      }),
    );
  }

  await prisma.$transaction([
    ...transactionArgs,
    ...nodeEntriesToUpdate.map((updateArgs) => prisma.nodeEntry.update(updateArgs)),
  ]);

  await countDatasetEntryTokens.enqueue({});
};