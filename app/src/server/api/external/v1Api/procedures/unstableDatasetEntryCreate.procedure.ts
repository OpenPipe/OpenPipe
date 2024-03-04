import { z } from "zod";

import { TRPCError } from "@trpc/server";
import {
  isRowToImport,
  openAIRowSchema,
  parseRowsToImport,
} from "~/server/utils/datasetEntryCreation/parseRowsToImport";
import { kysely, prisma } from "~/server/db";
import { prepareDatasetEntriesForImport } from "~/server/utils/datasetEntryCreation/prepareDatasetEntriesForImport";
import { openApiProtectedProc } from "../../openApiTrpc";
import { requireWriteKey } from "../helpers";
import { enqueueCountDatasetEntryTokens } from "~/server/tasks/fineTuning/countDatasetEntryTokens.task";
import { generatePersistentId } from "~/server/utils/nodes/utils";
import { enqueueProcessNode } from "~/server/tasks/nodes/processNodes/processNode.task";

export const unstableDatasetEntryCreate = openApiProtectedProc
  .meta({
    openapi: {
      method: "POST",
      path: "/unstable/dataset-entry/create",
      description:
        "Add new dataset entries. Note, this endpoint is unstable and may change without notice. Do not use without consulting the OpenPipe team.",
      protect: true,
    },
  })
  .input(
    z.object({
      archiveId: z.string(),
      entries: z.array(openAIRowSchema).min(1).max(100),
    }),
  )
  .output(
    z.object({
      createdEntries: z.number(),
      errors: z.array(
        z.object({
          index: z.number(),
          message: z.string(),
        }),
      ),
    }),
  )
  .mutation(async ({ input, ctx }) => {
    await requireWriteKey(ctx);

    const archive = await kysely
      .selectFrom("Node as n")
      .where("n.id", "=", input.archiveId)
      .where("n.projectId", "=", ctx.key.projectId)
      .innerJoin("DataChannel as dc", "dc.destinationId", "n.id")
      .selectAll("n")
      .select("dc.id as inputDataChannelId")
      .executeTakeFirst();

    if (!archive) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: `Archive with id '${input.archiveId}' not found`,
      });
    }

    const importedAt = new Date();

    const parsedRows = parseRowsToImport(input.entries.map((r) => JSON.stringify(r)));

    const errors: { index: number; message: string }[] = [];

    parsedRows.forEach((row, index) => {
      if ("error" in row) {
        errors.push({ index, message: row.error });
      }
    });

    const goodRows = parsedRows.filter(isRowToImport).map((r, index) => ({
      ...r,
      persistentId: generatePersistentId({
        creationTime: importedAt,
        key: index.toString(),
        nodeId: archive.id,
      }),
    }));

    const { datasetEntryInputsToCreate, datasetEntryOutputsToCreate, nodeEntriesToCreate } =
      await prepareDatasetEntriesForImport({
        projectId: ctx.key.projectId,
        dataChannelId: archive.inputDataChannelId,
        entriesToImport: goodRows,
      });

    await prisma.$transaction([
      prisma.datasetEntryInput.createMany({
        data: datasetEntryInputsToCreate,
        skipDuplicates: true,
      }),
      prisma.datasetEntryOutput.createMany({
        data: datasetEntryOutputsToCreate,
        skipDuplicates: true,
      }),
      prisma.nodeEntry.createMany({
        data: nodeEntriesToCreate,
        skipDuplicates: true,
      }),
    ]);

    await enqueueProcessNode({
      nodeId: archive.id,
    });

    await enqueueCountDatasetEntryTokens({ projectId: ctx.key.projectId });
    return {
      createdEntries: nodeEntriesToCreate.length,
      errors,
    };
  });
