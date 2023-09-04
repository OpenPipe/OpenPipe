import { type Prisma } from "@prisma/client";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import {
  type ChatCompletion,
  type CompletionCreateParams,
  type CreateChatCompletionRequestMessage,
} from "openai/resources/chat";
import { TRPCError } from "@trpc/server";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { prisma } from "~/server/db";
import { requireCanModifyProject, requireCanViewProject } from "~/utils/accessControl";
import { error, success } from "~/utils/errorHandling/standardResponses";
import { countOpenAIChatTokens } from "~/utils/countTokens";

export const datasetEntriesRouter = createTRPCRouter({
  list: protectedProcedure
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
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
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
  get: protectedProcedure.input(z.object({ id: z.string() })).query(async ({ input, ctx }) => {
    const entry = await prisma.datasetEntry.findUniqueOrThrow({
      where: { id: input.id },
      include: {
        dataset: true,
      },
    });

    if (!entry.dataset) {
      throw new TRPCError({ message: "Dataset not found for dataset entry", code: "NOT_FOUND" });
    }

    await requireCanViewProject(entry.dataset.projectId, ctx);

    if (!entry) {
      throw new TRPCError({ message: "Dataset entry not found", code: "NOT_FOUND" });
    }

    return entry;
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
      let trainingRatio = 0.8;
      if (input.datasetId) {
        datasetId = input.datasetId;
        const { projectId, trainingRatio: datasetTrainingRatio } =
          await prisma.dataset.findUniqueOrThrow({
            where: { id: input.datasetId },
          });
        trainingRatio = datasetTrainingRatio;
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

      for (const loggedCall of loggedCalls) {
        if (!loggedCall.modelResponse) continue;
        const inputMessages = (
          loggedCall.modelResponse?.reqPayload as unknown as CompletionCreateParams
        ).messages;
        let output: ChatCompletion.Choice.Message | undefined = undefined;
        const resp = loggedCall.modelResponse?.respPayload as unknown as ChatCompletion | undefined;
        if (resp && resp.choices?.[0]) {
          output = resp.choices[0].message;
        } else {
          output = {
            role: "assistant",
            content: "",
          };
        }

        creationTransactions.push(
          prisma.datasetEntry.create({
            data: {
              datasetId,
              loggedCallId: loggedCall.id,
              input: inputMessages as unknown as Prisma.InputJsonValue,
              output: output as unknown as Prisma.InputJsonValue,
              inputTokens: loggedCall.modelResponse?.inputTokens || 0,
              outputTokens: loggedCall.modelResponse?.outputTokens || 0,
              type: Math.random() < trainingRatio ? "TRAIN" : "TEST",
            },
          }),
        );
      }

      // Ensure dataset and dataset entries are created atomically
      await prisma.$transaction(creationTransactions);

      return success(datasetId);
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        updates: z.object({
          type: z.enum(["TRAIN", "TEST"]).optional(),
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

      let parsedInput = undefined;
      let inputTokens = undefined;
      if (input.updates.input) {
        parsedInput = JSON.parse(input.updates.input);
        inputTokens = countOpenAIChatTokens(
          "gpt-4-0613",
          parsedInput as unknown as CreateChatCompletionRequestMessage[],
        );
      }

      let parsedOutput = undefined;
      let outputTokens = undefined;
      if (input.updates.output) {
        parsedOutput = JSON.parse(input.updates.output);
        outputTokens = countOpenAIChatTokens("gpt-4-0613", [
          parsedOutput as unknown as ChatCompletion.Choice.Message,
        ]);
      }

      await prisma.datasetEntry.update({
        where: { id: input.id },
        data: {
          type: input.updates.type,
          input: parsedInput,
          output: parsedOutput,
          inputTokens,
          outputTokens,
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
