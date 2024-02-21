import { z } from "zod";

import { TRPCError } from "@trpc/server";
import {
  isRowToImport,
  openAIRowSchema,
  parseRowsToImport,
} from "~/components/datasets/parseRowsToImport";
import { prisma } from "~/server/db";
import { prepareDatasetEntriesForImport } from "~/server/utils/datasetEntryCreation/prepareDatasetEntriesForImport";
import { openApiProtectedProc } from "../../openApiTrpc";
import { requireWriteKey } from "../helpers";
import { countDatasetEntryTokens } from "~/server/tasks/fineTuning/countDatasetEntryTokens.task";

export const unstableDatasetEntryCreate = openApiProtectedProc
  .meta({
    openapi: {
      method: "POST",
      path: "/unstable/dataset-entry/create",
      description:
        "Create a new dataset entry. Note, this endpoint is unstable and may change without notice. Do not use without consulting the OpenPipe team.",
      protect: true,
    },
  })
  .input(
    z.object({
      datasetId: z.string(),
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

    const dataset = await prisma.dataset.findFirst({
      where: { id: input.datasetId, projectId: ctx.key.projectId },
    });
    if (!dataset) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: `Dataset with id '${input.datasetId}' not found in project`,
      });
    }

    const parsedRows = parseRowsToImport(input.entries.map((r) => JSON.stringify(r)));

    const errors: { index: number; message: string }[] = [];

    parsedRows.forEach((row, index) => {
      if ("error" in row) {
        errors.push({ index, message: row.error });
      }
    });

    const goodRows = parsedRows.filter(isRowToImport);
    const entriesToCreate = await prepareDatasetEntriesForImport(
      dataset.id,
      goodRows,
      "UPLOAD",
      new Date().toISOString(),
      null,
    );

    await prisma.datasetEntry.createMany({
      data: entriesToCreate,
    });

    await countDatasetEntryTokens.runNow({ datasetId: dataset.id });
    return {
      createdEntries: entriesToCreate.length,
      errors,
    };
  });
