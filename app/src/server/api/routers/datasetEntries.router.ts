import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import { type ChatCompletion, type ChatCompletionMessageParam } from "openai/resources/chat";
import { TRPCError } from "@trpc/server";
import archiver from "archiver";
import { WritableStreamBuffer } from "stream-buffers";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { prisma } from "~/server/db";
import { requireCanModifyProject, requireCanViewProject } from "~/utils/accessControl";
import { error, success } from "~/utils/errorHandling/standardResponses";
import { countLlamaChatTokensInMessages } from "~/utils/countTokens";
import { type TrainingRow } from "~/components/datasets/validateTrainingRows";
import hashObject from "~/server/utils/hashObject";
import { type JsonValue } from "type-fest";
import { formatEntriesFromTrainingRows } from "~/server/utils/createEntriesFromTrainingRows";
import { updatePruningRuleMatches } from "~/server/utils/updatePruningRuleMatches";
import { getTestResult } from "~/server/tasks/getTestResult.task";
import { validatedChatInput, validatedChatOutput } from "~/modelProviders/fine-tuned/utils";
import { truthyFilter } from "~/utils/utils";

export const datasetEntriesRouter = createTRPCRouter({
  list: protectedProcedure
    .input(z.object({ datasetId: z.string(), page: z.number(), pageSize: z.number() }))
    .query(async ({ input, ctx }) => {
      const { datasetId, page, pageSize } = input;

      const { projectId } = await prisma.dataset.findUniqueOrThrow({
        where: { id: datasetId },
      });
      await requireCanViewProject(projectId, ctx);

      const [entries, matchingEntries, trainingCount, testingCount] = await prisma.$transaction([
        prisma.datasetEntry.findMany({
          where: {
            datasetId: datasetId,
            outdated: false,
          },
          include: {
            matchedRules: {
              select: {
                pruningRule: {
                  select: {
                    tokensInText: true,
                  },
                },
              },
            },
          },
          orderBy: { sortKey: "desc" },
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
        prisma.datasetEntry.findMany({
          where: {
            datasetId: datasetId,
            outdated: false,
          },
          select: {
            id: true,
          },
        }),
        prisma.datasetEntry.count({
          where: {
            datasetId: datasetId,
            outdated: false,
            type: "TRAIN",
          },
        }),
        prisma.datasetEntry.count({
          where: {
            datasetId: datasetId,
            outdated: false,
            type: "TEST",
          },
        }),
      ]);

      const entriesWithUpdatedInputTokens = entries.map((entry) => ({
        ...entry,
        inputTokens:
          entry.inputTokens -
          entry.matchedRules.reduce((acc, match) => acc + match.pruningRule.tokensInText, 0),
      }));

      return {
        entries: entriesWithUpdatedInputTokens,
        matchingEntryIds: matchingEntries.map((entry) => entry.id),
        trainingCount,
        testingCount,
      };
    }),
  listTrainingEntries: protectedProcedure
    .input(z.object({ fineTuneId: z.string(), page: z.number(), pageSize: z.number() }))
    .query(async ({ input, ctx }) => {
      const { fineTuneId, page, pageSize } = input;

      const fineTune = await prisma.fineTune.findUnique({
        where: {
          id: fineTuneId,
        },
      });

      if (!fineTune) throw new TRPCError({ message: "Fine tune not found", code: "NOT_FOUND" });
      await requireCanViewProject(fineTune.projectId, ctx);

      const [entries, count] = await prisma.$transaction([
        prisma.fineTuneTrainingEntry.findMany({
          where: {
            fineTuneId: fineTuneId,
          },
          include: {
            datasetEntry: {
              select: {
                messages: true,
                function_call: true,
                functions: true,
                output: true,
                inputTokens: true,
                outputTokens: true,
              },
            },
          },
          orderBy: {
            datasetEntry: {
              sortKey: "desc",
            },
          },
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
        prisma.fineTuneTrainingEntry.count({
          where: {
            fineTuneId: fineTuneId,
          },
        }),
      ]);

      return {
        entries,
        count,
      };
    }),
  get: protectedProcedure.input(z.object({ id: z.string() })).query(async ({ input, ctx }) => {
    const entry = await prisma.datasetEntry.findUniqueOrThrow({
      where: { id: input.id },
      include: {
        dataset: true,
        matchedRules: {
          select: {
            pruningRule: {
              select: {
                textToMatch: true,
                tokensInText: true,
              },
            },
          },
        },
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
        loggedCallIds: z.string().array().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      let datasetId: string;
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
      } else {
        return error("No datasetId or newDatasetParams provided");
      }

      if (!input.loggedCallIds) {
        return error("No loggedCallIds provided");
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
        orderBy: { createdAt: "desc" },
      });

      const trainingRows = loggedCalls
        .map((loggedCall) => {
          const input = validatedChatInput(
            loggedCall.modelResponse?.reqPayload as { messages: unknown },
          );
          let output: ChatCompletionMessageParam;
          const resp = loggedCall.modelResponse?.respPayload as unknown as
            | ChatCompletion
            | undefined;
          if (resp && resp.choices?.[0]) {
            output = resp.choices[0].message;
          } else {
            return null;
          }
          return { input, output };
        })
        .filter(truthyFilter);

      const datasetEntriesToCreate = await formatEntriesFromTrainingRows(datasetId, trainingRows);

      // Ensure dataset and dataset entries are created atomically
      await prisma.$transaction([
        prisma.dataset.upsert({
          where: { id: datasetId },
          update: {},
          create: {
            id: datasetId,
            projectId: input.newDatasetParams?.projectId ?? "",
            name: input.newDatasetParams?.name ?? "",
            trainingRatio,
          },
        }),
        prisma.datasetEntry.createMany({
          data: datasetEntriesToCreate,
        }),
      ]);

      await updatePruningRuleMatches(
        datasetId,
        new Date(0),
        datasetEntriesToCreate.map((entry) => entry.id),
      );

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
        inputTokens = countLlamaChatTokensInMessages(
          parsedInput as unknown as ChatCompletionMessageParam[],
        );
      }

      let parsedOutput = undefined;
      let outputTokens = undefined;
      // The client might send "null" as a string, so we need to check for that
      if (input.updates.output && input.updates.output !== "null") {
        parsedOutput = JSON.parse(input.updates.output);
        outputTokens = countLlamaChatTokensInMessages([
          parsedOutput as unknown as ChatCompletionMessageParam,
        ]);
      }

      const prevEntry = await prisma.datasetEntry.update({
        where: { id: input.id },
        data: {
          outdated: true,
        },
        include: {
          matchedRules: {
            select: {
              pruningRuleId: true,
            },
          },
        },
      });

      const newEntry = await prisma.datasetEntry.create({
        data: {
          messages: parsedInput ?? prevEntry.messages,
          functions: parsedInput ?? prevEntry.functions,
          function_call: parsedInput ?? prevEntry.function_call,
          output: parsedOutput ?? prevEntry.output,
          inputTokens: inputTokens ?? prevEntry.inputTokens,
          outputTokens: outputTokens ?? prevEntry.outputTokens,
          type: input.updates.type ?? prevEntry.type,
          datasetId: prevEntry.datasetId,
          sortKey: prevEntry.sortKey,
          authoringUserId: ctx.session?.user.id,
          persistentId: prevEntry.persistentId,
          matchedRules: {
            create: prevEntry.matchedRules.map((match) => ({
              pruningRuleId: match.pruningRuleId,
            })),
          },
        },
      });

      await updatePruningRuleMatches(dataset.id, new Date(0), [newEntry.id]);

      if (newEntry.type === "TEST") {
        const fineTunes = await prisma.fineTune.findMany({
          where: {
            datasetId: dataset.id,
            status: "DEPLOYED",
          },
        });
        for (const fineTune of fineTunes) {
          await getTestResult.enqueue({ fineTuneId: fineTune.id, datasetEntryId: newEntry.id });
        }
      }

      return success(newEntry.id);
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

      await updatePruningRuleMatches(dataset.id, new Date(0), input.ids);

      return success("Dataset entries deleted");
    }),

  export: protectedProcedure
    .input(
      z.object({
        datasetId: z.string(),
        datasetEntryIds: z.string().array(),
        testingSplit: z.number(),
        removeDuplicates: z.boolean(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const { projectId } = await prisma.dataset.findUniqueOrThrow({
        where: { id: input.datasetId },
      });
      await requireCanViewProject(projectId, ctx);

      const datasetEntries = await ctx.prisma.datasetEntry.findMany({
        where: {
          id: {
            in: input.datasetEntryIds,
          },
        },
      });

      let rows: TrainingRow[] = datasetEntries.map((entry) => ({
        input: validatedChatInput(entry),
        output: validatedChatOutput(entry.output),
      }));

      if (input.removeDuplicates) {
        const deduplicatedRows = [];
        const rowHashSet = new Set<string>();
        for (const row of rows) {
          const rowHash = hashObject(row as unknown as JsonValue);
          if (!rowHashSet.has(rowHash)) {
            rowHashSet.add(rowHash);
            deduplicatedRows.push(row);
          }
        }
        rows = deduplicatedRows;
      }

      const splitIndex = Math.floor((rows.length * input.testingSplit) / 100);

      const testingData = rows.slice(0, splitIndex);
      const trainingData = rows.slice(splitIndex);

      // Convert arrays to JSONL format
      const trainingDataJSONL = trainingData.map((item) => JSON.stringify(item)).join("\n");
      const testingDataJSONL = testingData.map((item) => JSON.stringify(item)).join("\n");

      const output = new WritableStreamBuffer();
      const archive = archiver("zip");

      archive.pipe(output);
      archive.append(trainingDataJSONL, { name: "train.jsonl" });
      archive.append(testingDataJSONL, { name: "test.jsonl" });
      await archive.finalize();

      // Convert buffer to base64
      const base64 = output.getContents().toString("base64");

      return base64;
    }),
});
