import type { Node, NodeEntryStatus, Prisma } from "@prisma/client";
import { v4 as uuidv4 } from "uuid";

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
  resultsToSave,
}: {
  node: Pick<Node, "projectId" | "hash" | "type">;
  resultsToSave: SaveableProcessEntryResult[];
}) => {
  const outputsToCreate: Prisma.DatasetEntryOutputCreateManyInput[] = [];
  const cachedProcessedEntriesToCreate: Prisma.CachedProcessedEntryCreateManyInput[] = [];
  const nodeEntriesToUpdate: {
    id: string;
    data: {
      status: NodeEntryStatus;
      error?: string;
    };
  }[] = [];

  const nodeProperties = nodePropertiesByType[node.type];

  for (const result of resultsToSave) {
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
  await prisma.$transaction([...prismaTransactionArgs]);

  for (const cachedProcessedEntry of cachedProcessedEntriesToCreate) {
    // ensure matching cachedProcessedEntry does not exist before creating
    await kysely.transaction().execute(async (trx) => {
      let existingQuery = trx
        .selectFrom("CachedProcessedEntry")
        .where("projectId", "=", cachedProcessedEntry.projectId)
        .where("nodeHash", "=", node.hash);

      if (cachedProcessedEntry.nodeEntryPersistentId) {
        existingQuery = existingQuery.where(
          "nodeEntryPersistentId",
          "=",
          cachedProcessedEntry.nodeEntryPersistentId,
        );
      }
      if (cachedProcessedEntry.incomingInputHash) {
        existingQuery = existingQuery.where(
          "incomingInputHash",
          "=",
          cachedProcessedEntry.incomingInputHash,
        );
      }
      if (cachedProcessedEntry.incomingOutputHash) {
        existingQuery = existingQuery.where(
          "incomingOutputHash",
          "=",
          cachedProcessedEntry.incomingOutputHash,
        );
      }

      const existingCachedProcessedEntry = await existingQuery.executeTakeFirst();

      if (!existingCachedProcessedEntry) {
        await trx
          .insertInto("CachedProcessedEntry")
          .values({
            ...cachedProcessedEntry,
            id: uuidv4(),
            updatedAt: new Date(),
          })
          .execute();
      }
    });
  }

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
