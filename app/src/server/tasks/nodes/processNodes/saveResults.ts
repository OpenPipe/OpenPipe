import type { Node, NodeEntryStatus, Prisma } from "@prisma/client";

import {
  type ErrorProcessEntryResult,
  type SuccessProcessEntryResult,
  nodePropertiesByType,
} from "./processNode.task";
import { hashDatasetEntryOutput } from "~/server/utils/nodes/hashNode";
import { enqueueCountDatasetEntryTokens } from "../../fineTuning/countDatasetEntryTokens.task";
import { kysely, prisma } from "~/server/db";

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
  node: Pick<Node, "projectId" | "hash" | "type">;
  resultsToProcess: SaveableProcessEntryResult[];
}) => {
  const outputsToCreate: Prisma.DatasetEntryOutputCreateManyInput[] = [];
  const cachedProcessedEntriesToCreate: Prisma.CachedProcessedEntryCreateManyInput[] = [];
  const nodeEntriesToUpdate: {
    id: string;
    data: {
      status: NodeEntryStatus;
      outputHash?: string;
      originalOutputHash?: string;
      error?: string;
    };
  }[] = [];

  const nodeProperties = nodePropertiesByType[node.type];

  for (const result of resultsToProcess) {
    if (result.status === "PROCESSED") {
      let outputHash;
      if (result.output) {
        outputHash = hashDatasetEntryOutput({
          projectId: node.projectId,
          output: result.output,
        });
        outputsToCreate.push({
          projectId: node.projectId,
          hash: outputHash,
          output: result.output as unknown as Prisma.InputJsonValue,
        });
      }

      nodeEntriesToUpdate.push({
        id: result.nodeEntryId,
        data: {
          status: "PROCESSED",
          outputHash: outputHash ? outputHash : undefined,
          originalOutputHash: result.originalOutputHash ? result.originalOutputHash : undefined,
        },
      });

      const cachedProcessedEntryToCreate: Prisma.CachedProcessedEntryCreateManyInput = {
        nodeHash: node.hash,
        incomingInputHash: result.incomingInputHash,
        projectId: node.projectId,
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
        id: result.nodeEntryId,
        data: { status: result.status, error: result.error },
      });
    }
  }

  const prismaTransactionArgs = [];

  if (outputsToCreate.length) {
    prismaTransactionArgs.push(
      prisma.datasetEntryOutput.createMany({
        data: outputsToCreate,
        skipDuplicates: true,
      }),
    );
  }
  if (cachedProcessedEntriesToCreate.length) {
    prismaTransactionArgs.push(
      prisma.cachedProcessedEntry.createMany({
        data: cachedProcessedEntriesToCreate,
        skipDuplicates: true,
      }),
    );
  }

  await prisma.$transaction([...prismaTransactionArgs]);

  for (const nodeEntryUpdate of nodeEntriesToUpdate) {
    // ensure nodeEntry still exists before updating
    await kysely.transaction().execute(async (trx) => {
      const existingEntry = await trx
        .selectFrom("NodeEntry")
        .where("id", "=", nodeEntryUpdate.id)
        .executeTakeFirst();

      if (existingEntry) {
        await trx
          .updateTable("NodeEntry")
          .set(nodeEntryUpdate.data)
          .where("id", "=", nodeEntryUpdate.id)
          .execute();
      }
    });
  }

  await enqueueCountDatasetEntryTokens({ projectId: node.projectId });
};
