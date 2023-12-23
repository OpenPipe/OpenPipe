import { TRPCError } from "@trpc/server";
import archiver from "archiver";
import { sql } from "kysely";
import { jsonArrayFrom, jsonObjectFrom } from "kysely/helpers/postgres";
import { pick } from "lodash-es";
import { WritableStreamBuffer } from "stream-buffers";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";

import { type JsonValue } from "type-fest";
import { validateRowToImport } from "~/components/datasets/parseRowsToImport";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { kysely, prisma } from "~/server/db";
import { countDatasetEntryTokens } from "~/server/tasks/fineTuning/countDatasetEntryTokens.task";
import { queueRelabelDatasetEntries } from "~/server/tasks/relabelDatasetEntry.task";
import { constructDatasetEntryFiltersQuery } from "~/server/utils/constructDatasetEntryFiltersQuery";
import { constructEvaluationFiltersQuery } from "~/server/utils/constructEvaluationFiltersQuery";
import { constructLoggedCallFiltersQuery } from "~/server/utils/constructLoggedCallFiltersQuery";
import { copyEntryWithUpdates } from "~/server/utils/datasetEntryCreation/copyEntryWithUpdates";
import { prepareDatasetEntriesForImport } from "~/server/utils/datasetEntryCreation/prepareDatasetEntriesForImport";
import hashObject from "~/server/utils/hashObject";
import { startDatasetTestJobs } from "~/server/utils/startTestJobs";
import { updatePruningRuleMatches } from "~/server/utils/updatePruningRuleMatches";
import {
  ORIGINAL_MODEL_ID,
  typedDatasetEntry,
  typedFineTune,
  typedLoggedCall,
} from "~/types/dbColumns.types";
import { SortOrder, filtersSchema, toolsInput } from "~/types/shared.types";
import { requireCanModifyProject, requireCanViewProject } from "~/utils/accessControl";
import { isComparisonModel } from "~/utils/comparisonModels";
import { error, success } from "~/utils/errorHandling/standardResponses";
import { truthyFilter } from "~/utils/utils";

export const datasetEntriesRouter = createTRPCRouter({
  list: protectedProcedure
    .input(
      z.object({
        datasetId: z.string(),
        filters: filtersSchema,
        page: z.number(),
        pageSize: z.number(),

        sortOrder: z
          .object({
            field: z.enum(["createdAt", "inputTokens", "outputTokens", "split"]),
            order: z.enum(["asc", "desc"]),
          })
          .optional(),
      }),
    )
    .query(async ({ input, ctx }) => {
      const { datasetId, filters, page, pageSize } = input;

      const { projectId } = await prisma.dataset.findUniqueOrThrow({
        where: { id: datasetId },
      });
      await requireCanViewProject(projectId, ctx);

      const baseQuery = constructDatasetEntryFiltersQuery(filters, datasetId);

      let entriesQuery = baseQuery
        .select((eb) => [
          "de.id as id",
          "de.messages as messages",
          "de.output as output",
          "de.inputTokens as inputTokens",
          "de.outputTokens as outputTokens",
          "de.split as split",
          "de.sortKey as sortKey",
          "de.authoringUserId as authoringUserId",
          "de.persistentId as persistentId",
          "de.createdAt as createdAt",
          "de.updatedAt as updatedAt",
          "de.outdated as outdated",
          "de.datasetId as datasetId",
          jsonArrayFrom(
            eb
              .selectFrom("RelabelRequest as rr")
              .select(["rr.status"])
              .orderBy("rr.createdAt", "desc")
              .whereRef("rr.datasetEntryPersistentId", "=", "de.persistentId"),
          ).as("relabelStatuses"),
        ])
        .limit(pageSize)
        .offset((page - 1) * pageSize);

      if (input.sortOrder) {
        entriesQuery = entriesQuery.orderBy(`de.${input.sortOrder.field}`, input.sortOrder.order);
      } else {
        entriesQuery = entriesQuery.orderBy("de.sortKey", "desc");
      }

      const entries = await entriesQuery.execute();

      const matchingEntryIds = await baseQuery
        .select("de.id")
        .execute()
        .then((rows) => rows.map((row) => row.id));

      const matchingTrainingCount = await baseQuery
        .where("de.split", "=", "TRAIN")
        .where("de.output", "is not", null)
        .select((eb) => [eb.fn.count("de.id").as("count")])
        .executeTakeFirst()
        .then((result) => parseInt(result?.count as string));

      const totalTestingCount = await prisma.datasetEntry.count({
        where: {
          datasetId: datasetId,
          outdated: false,
          split: "TEST",
        },
      });

      return {
        entries,
        matchingEntryIds,
        matchingTrainingCount,
        totalTestingCount,
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
                tool_choice: true,
                tools: true,
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

    const history = await kysely
      .selectFrom("DatasetEntry")
      .where("persistentId", "=", entry.persistentId)
      .where("createdAt", "<=", entry.createdAt)
      .select((eb) => [
        "id",
        "provenance",
        "createdAt",
        jsonObjectFrom(
          eb
            .selectFrom("User")
            .select(["name"])
            .whereRef("User.id", "=", "DatasetEntry.authoringUserId"),
        ).as("authoringUser"),
      ])
      .orderBy("createdAt", "desc")
      .execute();

    return { ...typedDatasetEntry(entry), history };
  }),
  createFromLoggedCalls: protectedProcedure
    .input(
      z.object({
        datasetId: z.string().optional(),
        newDatasetParams: z.object({ projectId: z.string(), name: z.string() }).optional(),
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

      const loggedCalls = await constructLoggedCallFiltersQuery(input.filters, projectId, {
        ...pick(input, ["defaultToSelected", "selectedLogIds", "deselectedLogIds"]),
        removeUnsuccessful: true,
      })
        .where(
          "lc.id",
          "not in",
          sql`(select "loggedCallId" from "DatasetEntry" where "datasetId" = ${datasetId} and "loggedCallId" is not null)`,
        )
        .select(["lc.id", "lc.reqPayload", "lc.respPayload", "lc.inputTokens", "lc.outputTokens"])
        .orderBy(sql`random()`)
        .limit(input.sampleSize)
        .execute();

      if (!loggedCalls.length) {
        return error("No matching request logs");
      }

      const rowsToConvert = loggedCalls
        .map((loggedCall) => {
          try {
            const tLoggedCall = typedLoggedCall(loggedCall);

            const validated = validateRowToImport({
              input: tLoggedCall.reqPayload,
              output: tLoggedCall.respPayload?.choices?.[0]?.message,
            });

            if ("error" in validated) return null;
            return validated;
          } catch (e) {
            console.error(e);
            return null;
          }
        })
        .filter(truthyFilter);

      const importId = new Date().toISOString();
      const datasetEntriesToCreate = await prepareDatasetEntriesForImport(
        datasetId,
        rowsToConvert,
        "REQUEST_LOG",
        importId,
        ctx.session.user.id,
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
          split: z.enum(["TRAIN", "TEST"]).optional(),
          messages: z.string().optional(),
          tools: z.string().optional(),
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

      let updatedMessages = undefined;
      try {
        if (input.updates.messages) {
          updatedMessages = JSON.parse(input.updates.messages);
        }
      } catch (e) {
        return error("Invalid JSON for messages");
      }

      let updatedTools = undefined;
      try {
        if (input.updates.tools) {
          updatedTools = JSON.parse(input.updates.tools);
          toolsInput.parse(updatedTools);
        }
      } catch (e) {
        return error("Invalid tools format");
      }

      let updatedOutput = undefined;
      try {
        // The client might send "null" as a string, so we need to check for that
        if (input.updates.output && input.updates.output !== "null") {
          updatedOutput = JSON.parse(input.updates.output);
        }
      } catch (e) {
        return error("Invalid JSON for output");
      }

      const newEntry = await copyEntryWithUpdates(
        input.id,
        ctx.session.user.id,
        "RELABELED_BY_HUMAN",
        {
          split: input.updates.split,
          messages: updatedMessages,
          tools: updatedTools,
          output: updatedOutput,
        },
      );

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

  relabel: protectedProcedure
    .input(
      z.object({
        ids: z.string().array(),
      }),
    )
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

      const batchId = new Date().toISOString();

      // TODO: pass filters instead of ids to speed up query
      const datasetEntries = await prisma.datasetEntry.findMany({
        where: {
          id: {
            in: input.ids,
          },
          datasetId: dataset?.id,
        },
      });

      await queueRelabelDatasetEntries(batchId, ctx.session.user.id, datasetEntries);

      return success({ batchId });
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
        input: pick(entry, ["messages", "functions", "function_call", "tool_choice", "tools"]),
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
        visibleModelIds: z.string().array(),
        page: z.number(),
        pageSize: z.number(),
        sortOrder: z
          .object({
            modelId: z.string(),
            evalId: z.string(),
            order: z.enum([SortOrder.ASC, SortOrder.DESC]),
          })
          .optional(),
      }),
    )
    .query(async ({ input, ctx }) => {
      const { datasetId, filters, visibleModelIds, page, pageSize, sortOrder } = input;

      const dataset = await prisma.dataset.findUnique({
        where: {
          id: datasetId,
        },
      });

      if (!dataset) throw new TRPCError({ message: "Dataset not found", code: "NOT_FOUND" });
      await requireCanViewProject(dataset.projectId, ctx);

      const baseQuery = constructEvaluationFiltersQuery(filters, datasetId);

      let updatedQuery = baseQuery;

      if (sortOrder) {
        updatedQuery = updatedQuery
          .leftJoin(
            (eb) =>
              eb
                .selectFrom("DatasetEvalDatasetEntry as dede")
                .where("dede.datasetEvalId", "=", sortOrder.evalId)
                .leftJoin("DatasetEvalResult as der", "der.datasetEvalDatasetEntryId", "dede.id")
                .leftJoin(
                  "DatasetEvalOutputSource as deos",
                  "deos.id",
                  "der.datasetEvalOutputSourceId",
                )
                .where("deos.modelId", "=", sortOrder.modelId)
                .select((eb) => [
                  "dede.datasetEntryId as datasetEntryId",
                  eb.fn.agg<number>("AVG", [`der.score`]).as("score"),
                ])
                .groupBy("dede.datasetEntryId")
                .as("averageScoreForEval"),
            (join) => join.onRef("averageScoreForEval.datasetEntryId", "=", "de.id"),
          )
          // Ensure that rows with the sort eval applied are always shown first
          .orderBy(
            () =>
              sql`CASE
                WHEN "averageScoreForEval"."datasetEntryId" IS NULL THEN 1
                ELSE 0
              END`,
          )
          .orderBy(`averageScoreForEval.score`, sortOrder.order);
      }

      const entries = await updatedQuery
        .select((eb) => [
          "de.id as id",
          "de.messages as messages",
          "de.response_format as response_format",
          "de.output as output",
          jsonArrayFrom(
            eb
              .selectFrom("FineTuneTestingEntry as ftte")
              .select([
                "id",
                "ftte.modelId",
                "output",
                "score",
                "errorMessage",
                "finishReason",
                "inputTokens",
                "outputTokens",
              ])
              .whereRef("ftte.datasetEntryId", "=", "de.id")
              .where("ftte.modelId", "in", visibleModelIds),
          ).as("fineTuneTestDatasetEntries"),
          jsonArrayFrom(
            eb
              .selectFrom("DatasetEvalResult as der")
              .leftJoin("DatasetEvalDatasetEntry as dede", "dede.datasetEntryId", "de.id")
              .leftJoin(
                "DatasetEvalOutputSource as deos",
                "deos.id",
                "der.datasetEvalOutputSourceId",
              )
              .leftJoin(
                "DatasetEvalOutputSource as comparisonDeos",
                "comparisonDeos.id",
                "der.comparisonOutputSourceId",
              )
              .select(["der.score", "der.status", "deos.datasetEvalId", "deos.modelId"])
              .whereRef("der.datasetEvalDatasetEntryId", "=", "dede.id")
              .where((eb) =>
                eb.or([
                  eb("der.comparisonOutputSourceId", "is", null),
                  eb("comparisonDeos.modelId", "in", visibleModelIds),
                ]),
              ),
          ).as("datasetEvalResults"),
        ])
        .orderBy("de.sortKey", "desc")
        .offset((page - 1) * pageSize)
        .limit(pageSize)
        .execute();

      const count = await baseQuery
        .select("de.id")
        .execute()
        .then((rows) => rows.length);

      const pageIncomplete = entries.some(
        (entry) =>
          entry.fineTuneTestDatasetEntries.some((entry) => !entry.output) ||
          entry.datasetEvalResults.some(
            (entry) => entry.status === "PENDING" || entry.status === "IN_PROGRESS",
          ),
      );

      return {
        entries,
        count,
        pageIncomplete,
      };
    }),
  testingStats: protectedProcedure
    .input(
      z.object({
        datasetId: z.string(),
        filters: filtersSchema,
        modelId: z.string(),
        visibleModelIds: z.string().array(),
      }),
    )
    .query(async ({ input, ctx }) => {
      const { datasetId, filters, modelId, visibleModelIds } = input;

      const dataset = await prisma.dataset.findUnique({
        where: {
          id: datasetId,
        },
        include: {
          datasetEvals: true,
        },
      });

      const finishedCount = await kysely
        .selectFrom("FineTuneTestingEntry")
        .leftJoin("DatasetEntry", "FineTuneTestingEntry.datasetEntryId", "DatasetEntry.id")
        .where("FineTuneTestingEntry.modelId", "=", modelId)
        .where("DatasetEntry.outdated", "=", false)
        .where("DatasetEntry.datasetId", "=", datasetId)
        .where(sql`"FineTuneTestingEntry"."output" is not null`)
        .select(["FineTuneTestingEntry.id"])
        .execute();

      const baseQuery = constructEvaluationFiltersQuery(filters, datasetId);

      let updatedPerformanceQuery = baseQuery;

      let i = 0;
      // Add average score for each dataset eval
      for (const datasetEval of dataset?.datasetEvals ?? []) {
        const alias = `eval${i++}`;
        updatedPerformanceQuery = updatedPerformanceQuery
          .leftJoin(
            (eb) =>
              eb
                .selectFrom(`DatasetEvalDatasetEntry as dede`)
                .where("dede.datasetEvalId", "=", datasetEval.id)
                .leftJoin("DatasetEvalResult as der", "der.datasetEvalDatasetEntryId", "dede.id")
                .leftJoin(
                  "DatasetEvalOutputSource as deos",
                  "deos.id",
                  "der.datasetEvalOutputSourceId",
                )
                .where("deos.modelId", "=", modelId)
                .leftJoin(
                  "DatasetEvalOutputSource as comparisonDeos",
                  "comparisonDeos.id",
                  "der.comparisonOutputSourceId",
                )
                .where((eb) =>
                  eb.or([
                    eb("der.comparisonOutputSourceId", "is", null),
                    eb("comparisonDeos.modelId", "in", visibleModelIds),
                  ]),
                )
                .select((eb) => [
                  "dede.datasetEntryId as datasetEntryId",
                  eb.fn.agg<number>("AVG", [`der.score`]).as(`scoreForEval`),
                  sql`COUNT(CASE WHEN der.score = 1 THEN 1 ELSE NULL END)`.as(`wins`),
                  sql`COUNT(CASE WHEN der.score = .5 THEN 1 ELSE NULL END)`.as(`ties`),
                  sql`COUNT(CASE WHEN der.score = 0 THEN 1 ELSE NULL END)`.as(`losses`),
                  sql`COUNT(CASE WHEN der.status = 'PENDING' OR der.status = 'IN_PROGRESS' THEN 1 ELSE NULL END)`.as(
                    `pending`,
                  ),
                  sql`COUNT(CASE WHEN der.status = 'COMPLETE' OR der.status = 'ERROR' THEN 1 ELSE NULL END)`.as(
                    `complete`,
                  ),
                ])
                .groupBy("dede.datasetEntryId")
                .as(alias),
            (join) => join.onRef(`${alias}.datasetEntryId`, "=", sql.raw("de.id")),
          )
          .select((eb) => [
            eb.fn.agg<number>("AVG", [`${alias}.scoreForEval`]).as(`score_${datasetEval.id}`),
            sql.raw(`CAST(SUM(${alias}.wins) AS INT)`).as(`totalWins_${datasetEval.id}`),
            sql.raw(`CAST(SUM(${alias}.ties) AS INT)`).as(`totalTies_${datasetEval.id}`),
            sql.raw(`CAST(SUM(${alias}.losses) AS INT)`).as(`totalLosses_${datasetEval.id}`),
            sql.raw(`CAST(SUM(${alias}.pending) AS INT)`).as(`totalPending_${datasetEval.id}`),
            sql.raw(`CAST(SUM(${alias}.complete) AS INT)`).as(`totalComplete_${datasetEval.id}`),
            sql
              .raw(`CAST(COUNT(${alias}."datasetEntryId") AS INT)`)
              .as(`totalCount_${datasetEval.id}`),
          ]) as unknown as typeof baseQuery;
      }

      const performance = await updatedPerformanceQuery
        .select("de.datasetId")
        .groupBy("de.datasetId")
        .executeTakeFirst()
        .then((result) => result as typeof result & Record<string, number>);

      const evalPerformances: Record<
        string,
        {
          totalCount: number;
          numPending: number;
          numComplete: number;
          score: number | null;
          totalWins: number | null;
          totalTies: number | null;
          totalLosses: number | null;
        }
      > = {};

      for (const datasetEval of dataset?.datasetEvals ?? []) {
        if (
          !performance ||
          !(`totalCount_${datasetEval.id}` in performance) ||
          !performance[`totalCount_${datasetEval.id}`]
        )
          continue;
        evalPerformances[datasetEval.id] = {
          totalCount: performance[`totalCount_${datasetEval.id}`] ?? 0,
          numPending: performance[`totalPending_${datasetEval.id}`] ?? 0,
          numComplete: performance[`totalComplete_${datasetEval.id}`] ?? 0,
          score: performance[`score_${datasetEval.id}`] ?? null,
          totalWins: performance[`totalWins_${datasetEval.id}`] ?? null,
          totalTies: performance[`totalTies_${datasetEval.id}`] ?? null,
          totalLosses: performance[`totalLosses_${datasetEval.id}`] ?? null,
        };
      }

      if (!dataset) throw new TRPCError({ message: "Dataset not found", code: "NOT_FOUND" });
      await requireCanViewProject(dataset.projectId, ctx);

      let fineTune;
      if (modelId !== ORIGINAL_MODEL_ID && !isComparisonModel(modelId)) {
        fineTune = typedFineTune(
          await prisma.fineTune.findFirstOrThrow({
            where: { id: modelId },
            select: {
              slug: true,
              baseModel: true,
              provider: true,
            },
          }),
        );
      }

      const resultsPending = Object.values(evalPerformances).some(
        (performance) => performance.numPending > 0,
      );

      return {
        fineTune,
        finishedCount: finishedCount.length,
        evalPerformances,
        resultsPending,
      };
    }),
});
