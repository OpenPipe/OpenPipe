import { type Prisma } from "@prisma/client";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";

import { createTRPCRouter, protectedProcedure, publicProcedure } from "~/server/api/trpc";
import { prisma } from "~/server/db";
import { requireCanModifyProject, requireCanViewProject } from "~/utils/accessControl";
import { error, success } from "~/utils/errorHandling/standardResponses";

export const datasetEntriesRouter = createTRPCRouter({
  list: publicProcedure
    .input(z.object({ datasetId: z.string(), page: z.number(), pageSize: z.number() }))
    .query(async ({ input, ctx }) => {
      const { datasetId, page, pageSize } = input;

      const { projectId } = await prisma.dataset.findUniqueOrThrow({
        where: { id: datasetId },
      });
      await requireCanViewProject(projectId, ctx);

      const [entries, matchingEntries] = await prisma.$transaction([
        prisma.datasetEntry.findMany({
          where: {
            datasetId: datasetId,
          },
          orderBy: { createdAt: "asc" },
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
        prisma.datasetEntry.findMany({
          where: {
            datasetId: datasetId,
          },
          select: {
            id: true,
          },
        }),
      ]);

      return {
        entries,
        matchingEntryIds: matchingEntries.map((entry) => entry.id),
      };
    }),

  create: protectedProcedure
    .input(
      z.object({
        datasetId: z.string().optional(),
        newDatasetParams: z
          .object({
            projectId: z.string(),
            name: z.string(),
          })
          .optional(),
        loggedCallIds: z.string().array(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      let datasetId: string;
      const creationTransactions: Prisma.PrismaPromise<unknown>[] = [];
      if (input.datasetId) {
        datasetId = input.datasetId;
        const { projectId } = await prisma.dataset.findUniqueOrThrow({
          where: { id: input.datasetId },
        });
        await requireCanModifyProject(projectId, ctx);
      } else if (input.newDatasetParams) {
        await requireCanModifyProject(input.newDatasetParams.projectId, ctx);
        datasetId = uuidv4();
        creationTransactions.push(
          prisma.dataset.create({
            data: {
              id: datasetId,
              projectId: input.newDatasetParams.projectId,
              name: input.newDatasetParams.name,
            },
          }),
        );
      } else {
        return error("No datasetId or newDatasetParams provided");
      }

      const loggedCalls = await prisma.loggedCall.findMany({
        where: {
          id: {
            in: input.loggedCallIds,
          },
          modelResponse: {
            isNot: null,
          },
        },
        include: {
          modelResponse: {
            select: {
              reqPayload: true,
              respPayload: true,
              inputTokens: true,
              outputTokens: true,
            },
          },
        },
      });

      creationTransactions.push(
        prisma.datasetEntry.createMany({
          data: loggedCalls.map((loggedCall) => ({
            datasetId,
            loggedCallId: loggedCall.id,
            input: loggedCall.modelResponse?.reqPayload as Prisma.InputJsonValue,
            output: loggedCall.modelResponse?.respPayload as Prisma.InputJsonValue,
            inputTokens: loggedCall.modelResponse?.inputTokens || 0,
            outputTokens: loggedCall.modelResponse?.outputTokens || 0,
          })),
        }),
      );

      // Ensure dataset and dataset entries are created atomically
      await prisma.$transaction(creationTransactions);

      return success(datasetId);
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        updates: z.object({
          input: z.string().optional(),
          output: z.string().optional(),
        }),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const { dataset } = await prisma.datasetEntry.findUniqueOrThrow({
        where: { id: input.id },
        include: {
          dataset: true,
        },
      });

      if (!dataset) {
        return error("Dataset not found for dataset entry");
      }

      await requireCanModifyProject(dataset.projectId, ctx);

      await prisma.datasetEntry.update({
        where: { id: input.id },
        data: {
          input: input.updates.input,
          output: input.updates.output,
        },
      });

      return success("Dataset entry updated");
    }),

  delete: protectedProcedure
    .input(z.object({ ids: z.string().array() }))
    .mutation(async ({ input, ctx }) => {
      if (input.ids.length === 0) {
        return error("No ids provided");
      }
      const { dataset } = await prisma.datasetEntry.findUniqueOrThrow({
        where: { id: input.ids[0] },
        include: {
          dataset: true,
        },
      });

      if (!dataset) {
        return error("Dataset not found for dataset entry");
      }

      await requireCanModifyProject(dataset.projectId, ctx);

      await prisma.datasetEntry.deleteMany({
        where: {
          id: {
            in: input.ids,
          },
          datasetId: dataset?.id,
        },
      });

      return success("Dataset entries deleted");
    }),
});
