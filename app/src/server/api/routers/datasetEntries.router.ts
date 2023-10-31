import { type ComparisonModel } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import archiver from "archiver";
import { sql } from "kysely";
import { jsonArrayFrom } from "kysely/helpers/postgres";
import { pick, shuffle } from "lodash-es";
import { WritableStreamBuffer } from "stream-buffers";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";

import { type JsonValue } from "type-fest";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { kysely, prisma } from "~/server/db";
import { evaluateTestSetEntry } from "~/server/tasks/evaluateTestSetEntry.task";
import { countDatasetEntryTokens } from "~/server/tasks/fineTuning/countDatasetEntryTokens.task";
import { constructLoggedCallFiltersQuery } from "~/server/utils/constructLoggedCallFiltersQuery";
import hashObject from "~/server/utils/hashObject";
import { prepareDatasetEntriesForImport } from "~/server/utils/prepareDatasetEntriesForImport";
import { startDatasetTestJobs } from "~/server/utils/startTestJobs";
import { updatePruningRuleMatches } from "~/server/utils/updatePruningRuleMatches";
import { typedDatasetEntry, typedLoggedCallModelResponse } from "~/types/dbColumns.types";
import { SortOrder, chatMessage, filtersSchema } from "~/types/shared.types";
import { requireCanModifyProject, requireCanViewProject } from "~/utils/accessControl";
import {
  COMPARISON_MODEL_NAMES,
  getComparisonModel,
  isComparisonModel,
  isComparisonModelName,
} from "~/utils/baseModels";
import { countLlamaInputTokens, countLlamaOutputTokens } from "~/utils/countTokens";
import { error, success } from "~/utils/errorHandling/standardResponses";
import { truthyFilter } from "~/utils/utils";
import { constructEvaluationFiltersQuery } from "~/server/utils/constructEvaluationFiltersQuery";
import { constructDatasetEntryFiltersQuery } from "~/server/utils/constructDatasetEntryFiltersQuery";
import { validateRowToImport } from "~/components/datasets/parseRowsToImport";

export const datasetEntriesRouter = createTRPCRouter({
  list: protectedProcedure
    .input(
      z.object({
        datasetId: z.string(),
        filters: filtersSchema,
        page: z.number(),
        pageSize: z.number(),
      }),
    )
    .query(async ({ input, ctx }) => {
      const { datasetId, filters, page, pageSize } = input;

      const { projectId } = await prisma.dataset.findUniqueOrThrow({
        where: { id: datasetId },
      });
      await requireCanViewProject(projectId, ctx);

      const baseQuery = constructDatasetEntryFiltersQuery(filters, datasetId);

      const entries = (
        await baseQuery
          .select((eb) => [
            "de.id as id",
            "de.messages as messages",
            "de.function_call as function_call",
            "de.output as output",
            "de.inputTokens as inputTokens",
            "de.outputTokens as outputTokens",
            "de.type as type",
            "de.sortKey as sortKey",
            "de.authoringUserId as authoringUserId",
            "de.persistentId as persistentId",
            "de.createdAt as createdAt",
            "de.updatedAt as updatedAt",
            "de.outdated as outdated",
            "de.datasetId as datasetId",
            jsonArrayFrom(
              eb
                .selectFrom("PruningRuleMatch as prm")
                .leftJoin("PruningRule as pr", "prm.pruningRuleId", "pr.id")
                .select(["pr.textToMatch", "pr.tokensInText"])
                .whereRef("prm.datasetEntryId", "=", "de.id"),
            ).as("matchedRules"),
          ])
          .orderBy("de.sortKey", "desc")
          .limit(pageSize)
          .offset((page - 1) * pageSize)
          .execute()
      ).map((entry) => ({
        ...entry,
        inputTokens:
          entry.inputTokens -
          entry.matchedRules.reduce((acc, match) => acc + (match.tokensInText ?? 0), 0),
        matchedRules: entry.matchedRules.map((match) => ({
          textToMatch: match.textToMatch as string,
          tokensInText: match.tokensInText as number,
        })),
      }));

      const matchingEntryIds = await baseQuery
        .select("de.id")
        .execute()
        .then((rows) => rows.map((row) => row.id));

      const [trainingCount, testingCount] = await prisma.$transaction([
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

      return {
        entries,
        matchingEntryIds,
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

      const typedEntries = entries.map((entry) => ({
        ...entry,
        datasetEntry: typedDatasetEntry(entry.datasetEntry),
      }));

      return {
        entries: typedEntries,
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

    return typedDatasetEntry(entry);
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
        filters: filtersSchema,
        defaultToSelected: z.boolean(),
        selectedLogIds: z.string().array(),
        deselectedLogIds: z.string().array(),
        sampleSize: z.number(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      let projectId: string;
      let datasetId: string;
      let trainingRatio = 0.8;
      if (input.datasetId) {
        datasetId = input.datasetId;
        const dataset = await prisma.dataset.findUniqueOrThrow({
          where: { id: input.datasetId },
        });
        trainingRatio = dataset.trainingRatio;
        projectId = dataset.projectId;
      } else if (input.newDatasetParams) {
        projectId = input.newDatasetParams.projectId;
        datasetId = uuidv4();
      } else {
        return error("No datasetId or newDatasetParams provided");
      }

      await requireCanModifyProject(projectId, ctx);

      const baseQuery = constructLoggedCallFiltersQuery(
        input.filters,
        projectId,
        pick(input, ["defaultToSelected", "selectedLogIds", "deselectedLogIds"]),
      );

      const loggedCallIds = (await baseQuery.select(["lc.id"]).execute()).map((row) => row.id);

      if (!loggedCallIds.length) {
        return error("No matching request logs");
      }

      // randomly sample from the logged calls
      const shuffledLoggedCallIds = shuffle(loggedCallIds);
      const sampledLoggedCallIds = shuffledLoggedCallIds.slice(0, input.sampleSize);

      const loggedCalls = await prisma.loggedCall.findMany({
        where: {
          id: {
            in: sampledLoggedCallIds,
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

      const rowsToConvert = loggedCalls
        .map((loggedCall) => {
          const modelResponse =
            loggedCall.modelResponse && typedLoggedCallModelResponse(loggedCall.modelResponse);

          const validated = validateRowToImport({
            input: modelResponse?.reqPayload,
            output: modelResponse?.respPayload?.choices[0]?.message,
          });

          if ("error" in validated) return null;
          return validated;
        })
        .filter(truthyFilter);

      const importId = Date.now().toString();
      const datasetEntriesToCreate = await prepareDatasetEntriesForImport(
        datasetId,
        rowsToConvert,
        "REQUEST_LOG",
        importId,
      );

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

      await startDatasetTestJobs(datasetId);

      await countDatasetEntryTokens.enqueue();

      return success({ datasetId, importId });
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

      let parsedMessages = prevEntry.messages;

      if (input.updates.input) {
        parsedMessages = JSON.parse(input.updates.input);
      }

      let newOutput = prevEntry.output;
      // The client might send "null" as a string, so we need to check for that
      if (input.updates.output && input.updates.output !== "null") {
        newOutput = JSON.parse(input.updates.output);
      }
      const validatedOutput = chatMessage.parse(newOutput);

      const inputFields = typedDatasetEntry({
        messages: parsedMessages,
        functions: prevEntry.functions ?? undefined,
        function_call: prevEntry.function_call ?? undefined,
      });

      const newEntry = await prisma.datasetEntry.create({
        data: {
          ...inputFields,
          output: validatedOutput,
          inputTokens: countLlamaInputTokens(inputFields),
          outputTokens: countLlamaOutputTokens(validatedOutput),
          type: input.updates.type ?? prevEntry.type,
          datasetId: prevEntry.datasetId,
          sortKey: prevEntry.sortKey,
          provenance: "RELABELED_BY_HUMAN",
          authoringUserId: ctx.session?.user.id,
          persistentId: prevEntry.persistentId,
          importId: prevEntry.importId,
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
          await evaluateTestSetEntry.enqueue({
            modelId: fineTune.id,
            datasetEntryId: newEntry.id,
          });
        }
        for (const comparisonModel of dataset.enabledComparisonModels) {
          await evaluateTestSetEntry.enqueue({
            modelId: comparisonModel,
            datasetEntryId: newEntry.id,
          });
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

      let rows = datasetEntries.map(typedDatasetEntry).map((entry) => ({
        input: pick(entry, ["messages", "functions", "function_call"]),
        output: entry.output,
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
  listTestingEntries: protectedProcedure
    .input(
      z.object({
        datasetId: z.string(),
        filters: filtersSchema,
        page: z.number(),
        pageSize: z.number(),
        sort: z
          .object({
            sortModelSlug: z.string().optional(),
            sortOrder: z.string().optional(),
          })
          .optional(),
      }),
    )
    .query(async ({ input, ctx }) => {
      const { datasetId, filters, page, pageSize, sort } = input;

      const dataset = await prisma.dataset.findUnique({
        where: {
          id: datasetId,
        },
      });

      if (!dataset) throw new TRPCError({ message: "Dataset not found", code: "NOT_FOUND" });
      await requireCanViewProject(dataset.projectId, ctx);

      let sortModelId = "";
      if (sort?.sortModelSlug && isComparisonModelName(sort?.sortModelSlug)) {
        sortModelId = getComparisonModel(sort?.sortModelSlug) ?? "";
      } else if (sort?.sortModelSlug) {
        const fineTune = await prisma.fineTune.findFirst({
          where: {
            slug: sort?.sortModelSlug,
          },
          select: {
            id: true,
          },
        });
        sortModelId = fineTune?.id ?? "";
      }

      let scoreSortOrder: SortOrder = SortOrder.DESC;
      if (sort?.sortOrder === "asc") {
        scoreSortOrder = SortOrder.ASC;
      }

      const baseQuery = constructEvaluationFiltersQuery(filters, datasetId);

      const entries = await baseQuery
        .leftJoin(
          (eb) =>
            eb
              .selectFrom("FineTuneTestingEntry")
              .select(["modelId", "score", "datasetEntryId"])
              .where("modelId", "=", sortModelId)
              .as("sftte"),
          (join) => join.onRef("sftte.datasetEntryId", "=", "de.id"),
        )
        .select((eb) => [
          "de.id as id",
          "de.messages as messages",
          "de.function_call as function_call",
          "de.output as output",
          jsonArrayFrom(
            eb
              .selectFrom("FineTuneTestingEntry as ftte")
              .select(["modelId", "output", "score", "errorMessage"])
              .whereRef("ftte.datasetEntryId", "=", "de.id"),
          ).as("fineTuneTestDatasetEntries"),
        ])
        .orderBy(() =>
          sql.raw(
            `CASE
             WHEN sftte.score IS NULL THEN 1
             ELSE 0
           END`,
          ),
        )
        .orderBy("sftte.score", scoreSortOrder)
        .orderBy("de.sortKey", "desc")
        .offset((page - 1) * pageSize)
        .limit(pageSize)
        .execute();

      const count = await baseQuery
        .select("de.id")
        .execute()
        .then((rows) => rows.length);

      const pageIncomplete = !!entries.find((entry) =>
        entry.fineTuneTestDatasetEntries.find((entry) => !entry.output),
      );

      return {
        entries,
        count,
        pageIncomplete,
      };
    }),
  testingStats: protectedProcedure
    .input(z.object({ datasetId: z.string(), filters: filtersSchema, modelId: z.string() }))
    .query(async ({ input, ctx }) => {
      const { datasetId, filters, modelId } = input;

      const dataset = await prisma.dataset.findUnique({
        where: {
          id: datasetId,
        },
      });

      const finishedCount = await kysely
        .selectFrom("FineTuneTestingEntry")
        .leftJoin("DatasetEntry", "FineTuneTestingEntry.datasetEntryId", "DatasetEntry.id")
        .where("FineTuneTestingEntry.modelId", "=", modelId)
        .where("DatasetEntry.outdated", "=", false)
        .where("DatasetEntry.datasetId", "=", datasetId)
        .where(sql.raw(`"FineTuneTestingEntry"."output" is not null`))
        .select(["FineTuneTestingEntry.id"])
        .execute();

      const baseQuery = constructEvaluationFiltersQuery(filters, datasetId);

      const averageScoreResult = await baseQuery
        .leftJoin("FineTuneTestingEntry as te", "de.id", "te.datasetEntryId")
        .where("te.modelId", "=", modelId)
        .where(sql.raw(`te."output" is not null`))
        .select(({ fn }) => ["te.modelId", fn.agg<number>("AVG", ["te.score"]).as("averageScore")])
        .groupBy("te.modelId")
        .execute();

      const averageScore = averageScoreResult[0] ? averageScoreResult[0].averageScore : null;

      if (!dataset) throw new TRPCError({ message: "Dataset not found", code: "NOT_FOUND" });
      await requireCanViewProject(dataset.projectId, ctx);

      let slug;
      let baseModel;
      if (isComparisonModel(modelId)) {
        slug = COMPARISON_MODEL_NAMES[modelId as ComparisonModel];
      } else {
        const fineTune = await prisma.fineTune.findUnique({
          where: {
            id: modelId,
          },
        });
        if (!fineTune) throw new TRPCError({ message: "Fine tune not found", code: "NOT_FOUND" });
        slug = fineTune.slug;
        baseModel = fineTune.baseModel;
      }

      return {
        slug,
        baseModel,
        isComparisonModel: isComparisonModel(modelId),
        finishedCount: finishedCount.length,
        averageScore,
      };
    }),
});
