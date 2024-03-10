import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { kysely, prisma } from "~/server/db";
import { requireCanModifyProject, requireCanViewProject } from "~/utils/accessControl";
import { error, success } from "~/utils/errorHandling/standardResponses";

import { shuffle } from "lodash-es";
import { jsonArrayFrom } from "kysely/helpers/postgres";
import { TRPCError } from "@trpc/server";
import { ORIGINAL_MODEL_ID, typedFineTune } from "~/types/dbColumns.types";
import { sql } from "kysely";
import { startTestJobsForEval } from "~/server/utils/nodes/startTestJobs";
import { constructEvaluationFiltersQuery } from "~/server/utils/constructEvaluationFiltersQuery";
import { filtersSchema } from "~/types/shared.types";
import { isComparisonModel } from "~/utils/comparisonModels";
import {
  RESPONSE_1_PLACEHOLDER,
  RESPONSE_2_PLACEHOLDER,
  getModelTitle,
} from "~/server/tasks/evaluateTestSetEntries.task";

export const datasetEvalsRouter = createTRPCRouter({
  get: protectedProcedure.input(z.object({ id: z.string() })).query(async ({ input, ctx }) => {
    const datasetNodeId = await kysely
      .selectFrom("DatasetEval as de")
      .where("de.id", "=", input.id)
      .innerJoin("Dataset as d", "d.id", "de.datasetId")
      .select("d.nodeId")
      .executeTakeFirst()
      .then((row) => row?.nodeId);

    if (!datasetNodeId) {
      throw new TRPCError({ message: "Dataset eval node not found", code: "NOT_FOUND" });
    }

    const datasetEval = await kysely
      .selectFrom("DatasetEval as eval")
      .where("eval.id", "=", input.id)
      .leftJoin("Dataset as d", "d.id", "eval.datasetId")
      .select((eb) => [
        "eval.id",
        "eval.name",
        "eval.instructions",
        "eval.datasetId",
        "d.projectId",
        "d.name as datasetName",
        jsonArrayFrom(
          eb
            .selectFrom("DatasetEvalOutputSource as deos")
            .where("deos.datasetEvalId", "=", input.id)
            .select(["deos.id", "deos.modelId"])
            .orderBy("deos.createdAt", "asc"),
        ).as("outputSources"),
        eb
          .selectFrom("DatasetEvalNodeEntry as dene")
          .whereRef("dene.datasetEvalId", "=", "eval.id")
          .innerJoin("DataChannel as dc", "dc.destinationId", "d.nodeId")
          .innerJoin("NodeEntry as ne", (join) =>
            join
              .onRef("ne.dataChannelId", "=", "dc.id")
              .onRef("ne.persistentId", "=", "dene.nodeEntryPersistentId")
              .on("ne.split", "=", "TEST")
              .on("ne.status", "=", "PROCESSED"),
          )
          .select((eb) => [eb.fn.count<string>("dene.id").as("count")])
          .as("numRows"),
      ])
      .groupBy(["eval.id", "d.name", "d.projectId", "d.nodeId"])
      .executeTakeFirst();

    if (!datasetEval?.projectId)
      throw new TRPCError({ message: "Dataset eval not found", code: "NOT_FOUND" });

    await requireCanViewProject(datasetEval.projectId, ctx);

    const resultsBaseQuery = kysely
      .selectFrom("DatasetEvalOutputSource as deos")
      .where("deos.datasetEvalId", "=", input.id)
      .innerJoin("DatasetEvalResult as der", "der.datasetEvalOutputSourceId", "deos.id")
      .innerJoin("DatasetEvalNodeEntry as dene", "dene.id", "der.datasetEvalNodeEntryId")
      .innerJoin("DataChannel as dc", (join) => join.on("dc.destinationId", "=", datasetNodeId))
      .innerJoin("NodeEntry as ne", (join) =>
        join
          .onRef("ne.dataChannelId", "=", "dc.id")
          .onRef("ne.persistentId", "=", "dene.nodeEntryPersistentId")
          .on("ne.split", "=", "TEST")
          .onRef("ne.inputHash", "=", "der.nodeEntryInputHash"),
      )
      .leftJoin("FineTune as ft", (join) => join.onRef(sql`ft.id::text`, "=", "deos.modelId"));

    const [leaderboard, headToHead, completionCount] = await Promise.all([
      resultsBaseQuery
        .select((eb) => [
          "deos.modelId as modelId",
          "ft.slug as slug",
          eb.fn.avg<number>("der.score").as("winRate"),
          sql<number>`count(case when der.score = 1 then 1 end)::int`.as("wins"),
          sql<number>`count(case when der.score = .5 then 1 end)::int`.as("ties"),
          sql<number>`count(case when der.score = 0 then 1 end)::int`.as("losses"),
        ])
        .groupBy(["modelId", "slug"])
        .orderBy("winRate", "desc")
        .execute(),

      resultsBaseQuery
        .innerJoin("DatasetEvalOutputSource as deos2", "deos2.id", "der.comparisonOutputSourceId")
        .leftJoin("FineTune as ft2", (join) => join.onRef(sql`ft2.id::text`, "=", "deos2.modelId"))
        .select((eb) => [
          "deos.modelId as modelId1",
          "ft.slug as slug1",
          eb.fn.avg<number>("der.score").as("winRate"),
          "deos2.modelId as modelId2",
          "ft2.slug as slug2",
        ])
        .groupBy(["modelId1", "slug1", "modelId2", "slug2"])
        .execute(),

      resultsBaseQuery
        .select([
          sql<number>`count(case when der.status = 'COMPLETE' then 1 end)::int`.as(
            "completedResults",
          ),
          sql<number>`count(*)::int`.as("totalResults"),
        ])
        .executeTakeFirst(),
    ]);

    return {
      ...datasetEval,
      numRows: parseInt(datasetEval.numRows ?? "0"),
      results: {
        leaderboard,
        headToHead,
        completionCount: {
          // divide by 2 because each comparison has two results
          completedComparisons: (completionCount?.completedResults ?? 0) / 2,
          totalComparisons: (completionCount?.totalResults ?? 0) / 2,
        },
      },
    };
  }),

  list: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ input, ctx }) => {
      const { projectId } = input;
      await requireCanViewProject(projectId, ctx);

      const datasetEvals = await kysely
        .selectFrom("DatasetEval as eval")
        .where("eval.type", "=", "HEAD_TO_HEAD")
        .where("eval.datasetId", "in", (eb) =>
          eb.selectFrom("Dataset as d").where("d.projectId", "=", projectId).select("d.id"),
        )
        .innerJoin("Dataset as d", "d.id", "eval.datasetId")
        .leftJoin(
          (eb) =>
            eb
              .selectFrom("DatasetEvalOutputSource as deos")
              .select((eb) => [
                "deos.datasetEvalId",
                eb.fn.count<string>("deos.id").as("numModels"),
              ])
              .groupBy("deos.datasetEvalId")
              .as("modelsSubquery"),
          (join) => join.onRef("modelsSubquery.datasetEvalId", "=", "eval.id"),
        )
        .leftJoin("DatasetEvalNodeEntry as dene", "dene.datasetEvalId", "eval.id")
        .innerJoin("DataChannel as dc", "dc.destinationId", "d.nodeId")
        .innerJoin("NodeEntry as ne", (join) =>
          join
            .onRef("ne.dataChannelId", "=", "dc.id")
            .onRef("ne.persistentId", "=", "dene.nodeEntryPersistentId")
            .on("ne.split", "=", "TEST")
            .on("ne.status", "=", "PROCESSED"),
        )
        .select((eb) => [
          "eval.id",
          "eval.name",
          "eval.instructions",
          "eval.createdAt",
          "d.id as datasetId",
          "d.name as datasetName",
          "d.projectId",
          "modelsSubquery.numModels",
          eb.fn.count<string>("dene.id").as("numRows"),
        ])
        .groupBy(["modelsSubquery.numModels", "eval.id", "d.id", "d.projectId"])
        .orderBy("eval.createdAt", "desc")
        .execute();

      return datasetEvals.map((datasetEval) => ({
        ...datasetEval,
        numRows: parseInt(datasetEval.numRows),
        numModels: parseInt(datasetEval.numModels ?? "0"),
      }));
    }),

  create: protectedProcedure
    .input(
      z.object({
        datasetId: z.string(),
        name: z.string(),
        instructions: z.string(),
        modelIds: z.array(z.string()),
        numRows: z.number(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const dataset = await prisma.dataset.findUniqueOrThrow({
        where: { id: input.datasetId },
      });
      await requireCanModifyProject(dataset.projectId, ctx);

      const existingEval = await prisma.datasetEval.findFirst({
        where: {
          datasetId: input.datasetId,
          name: input.name,
        },
      });

      if (existingEval) {
        return error(`An evaluation with the name "${input.name}" already exists`);
      }

      const testNodeEntries = await kysely
        .selectFrom("NodeEntry as ne")
        .innerJoin("DataChannel as dc", (join) =>
          join.on("dc.destinationId", "=", dataset.nodeId).onRef("dc.id", "=", "ne.dataChannelId"),
        )
        .where("ne.split", "=", "TEST")
        .where("ne.status", "=", "PROCESSED")
        .select(["ne.persistentId"])
        .execute();

      if (testNodeEntries.length < input.numRows) {
        return error(
          `The test set only has ${testNodeEntries.length} entries, but ${input.numRows} were requested`,
        );
      }

      const shuffledNodeEntries = shuffle(testNodeEntries).slice(0, input.numRows);

      let datasetEval;
      try {
        datasetEval = await prisma.datasetEval.create({
          data: {
            name: input.name,
            instructions: input.instructions,
            datasetId: input.datasetId,
            datasetEvalOutputSources: {
              create: input.modelIds.map((modelId) => ({
                modelId,
              })),
            },
            datasetEvalNodeEntries: {
              create: shuffledNodeEntries.map((nodeEntry) => ({
                nodeEntryPersistentId: nodeEntry.persistentId,
              })),
            },
          },
          include: {
            datasetEvalOutputSources: true,
            datasetEvalNodeEntries: true,
          },
        });

        await startTestJobsForEval({
          datasetEvalId: datasetEval.id,
          nodeEntryBaseQuery: kysely
            .selectFrom("NodeEntry as ne")
            .innerJoin("DataChannel as dc", (join) =>
              join
                .on("dc.destinationId", "=", dataset.nodeId)
                .onRef("dc.id", "=", "ne.dataChannelId"),
            )
            .where("ne.split", "=", "TEST")
            .where("ne.status", "=", "PROCESSED"),
        });
      } catch (e) {
        console.error("Failed to create dataset eval:", (e as { message: string }).message);
        if (datasetEval) await prisma.datasetEval.delete({ where: { id: datasetEval.id } });
        return error("Failed to create dataset eval");
      }

      return success(datasetEval.id);
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        updates: z.object({
          name: z.string().optional(),
          instructions: z.string().optional(),
          modelIds: z.array(z.string()).optional(),
          numRows: z.number().optional(),
        }),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const datasetEval = await prisma.datasetEval.findUniqueOrThrow({
        where: { id: input.id },
        include: {
          dataset: true,
        },
      });
      await requireCanModifyProject(datasetEval.dataset.projectId, ctx);

      if (!datasetEval.dataset.nodeId) return error("Dataset node not found");

      let shouldQueueEvalJobs = false;

      const numTestNodeEntries = await kysely
        .selectFrom("NodeEntry as ne")
        .innerJoin("DataChannel as dc", (join) =>
          join
            .on("dc.destinationId", "=", datasetEval.dataset.nodeId)
            .onRef("dc.id", "=", "ne.dataChannelId"),
        )
        .where("ne.split", "=", "TEST")
        .where("ne.status", "=", "PROCESSED")
        .select([sql<number>`count(ne."persistentId")::int`.as("numRows")])
        .executeTakeFirst()
        .then((row) => row?.numRows ?? 0);

      if (input.updates.numRows && numTestNodeEntries < input.updates.numRows) {
        return error(
          `The test set only has ${numTestNodeEntries} entries, but ${input.updates.numRows} were requested`,
        );
      }

      await prisma.datasetEval.update({
        where: { id: input.id },
        data: {
          name: input.updates.name,
          instructions: input.updates.instructions,
        },
      });

      if (input.updates.instructions && input.updates.instructions !== datasetEval.instructions) {
        await kysely
          .deleteFrom("DatasetEvalResult as der")
          .where(({ exists, selectFrom }) =>
            exists(
              selectFrom("DatasetEvalOutputSource as deos")
                .select(["deos.id", "deos.datasetEvalId"])
                .where("deos.datasetEvalId", "=", input.id)
                .whereRef("deos.id", "=", "der.datasetEvalOutputSourceId"),
            ),
          )
          .execute();
        shouldQueueEvalJobs = true;
      }

      if (input.updates.modelIds) {
        const updatedModelIds = input.updates.modelIds;
        const currentModelIds = await prisma.datasetEvalOutputSource
          .findMany({
            where: { datasetEvalId: input.id },
            select: { modelId: true },
          })
          .then((models) => models.map((model) => model.modelId));

        const modelIdsToDelete = currentModelIds.filter(
          (modelId) => !updatedModelIds.includes(modelId),
        );
        await prisma.datasetEvalOutputSource.deleteMany({
          where: {
            datasetEvalId: input.id,
            modelId: { in: modelIdsToDelete },
          },
        });

        const modelIdsToAdd = updatedModelIds.filter(
          (modelId) => !currentModelIds.includes(modelId),
        );
        await prisma.datasetEvalOutputSource.createMany({
          data: modelIdsToAdd.map((modelId) => ({
            datasetEvalId: input.id,
            modelId,
          })),
        });
        if (modelIdsToAdd.length || modelIdsToDelete.length) shouldQueueEvalJobs = true;
      }

      const currentDatasetEvalNodeEntries = await kysely
        .selectFrom("DatasetEvalNodeEntry as dene")
        .where("dene.datasetEvalId", "=", input.id)
        .innerJoin("DataChannel as dc", (join) =>
          join.on("dc.destinationId", "=", datasetEval.dataset.nodeId),
        )
        .innerJoin("NodeEntry as ne", (join) =>
          join
            .onRef("ne.dataChannelId", "=", "dc.id")
            .onRef("ne.persistentId", "=", "dene.nodeEntryPersistentId")
            .on("ne.split", "=", "TEST")
            .on("ne.status", "=", "PROCESSED"),
        )
        .selectAll("dene")
        .execute();

      const currentNumRows = currentDatasetEvalNodeEntries.length;

      if (input.updates.numRows && input.updates.numRows !== currentNumRows) {
        // delete all datasetEvalNodeEntries without NodeEntries currently in dataset
        await kysely
          .deleteFrom("DatasetEvalNodeEntry as dene")
          .where("dene.datasetEvalId", "=", input.id)
          .where((eb) =>
            eb.not(
              eb.exists(
                eb
                  .selectFrom("NodeEntry as ne")
                  .innerJoin("DataChannel as dc", (join) =>
                    join
                      .on("dc.destinationId", "=", datasetEval.dataset.nodeId)
                      .onRef("dc.id", "=", "ne.dataChannelId"),
                  )
                  .where("ne.split", "=", "TEST")
                  .whereRef("ne.persistentId", "=", "dene.nodeEntryPersistentId"),
              ),
            ),
          )
          .execute();

        if (currentNumRows > input.updates.numRows) {
          const numRowsToDelete = currentNumRows - input.updates.numRows;

          const datasetEvalNodeEntriesToDelete = shuffle(
            currentDatasetEvalNodeEntries.map((entry) => entry.id),
          ).slice(0, numRowsToDelete);

          await kysely
            .deleteFrom("DatasetEvalNodeEntry")
            .where("id", "in", datasetEvalNodeEntriesToDelete)
            .execute();
        } else {
          const numRowsToCreate = input.updates.numRows - currentNumRows;

          const nodeEntriesToCreate = await kysely
            .selectFrom("NodeEntry as ne")
            .innerJoin("DataChannel as dc", (join) =>
              join
                .on("dc.destinationId", "=", datasetEval.dataset.nodeId)
                .onRef("dc.id", "=", "ne.dataChannelId"),
            )
            .where("ne.split", "=", "TEST")
            .where("ne.status", "=", "PROCESSED")
            .leftJoin("DatasetEvalNodeEntry as dene", (join) =>
              join
                .onRef("dene.nodeEntryPersistentId", "=", "ne.persistentId")
                .on("dene.datasetEvalId", "=", input.id),
            )
            .where("dene.id", "is", null)
            .orderBy(sql`random()`)
            .limit(numRowsToCreate)
            .select(["ne.persistentId"])
            .execute();

          await prisma.datasetEvalNodeEntry.createMany({
            data: nodeEntriesToCreate.map((nodeEntry) => ({
              nodeEntryPersistentId: nodeEntry.persistentId,
              datasetEvalId: input.id,
            })),
          });
        }

        shouldQueueEvalJobs = true;
      }

      if (shouldQueueEvalJobs) {
        await startTestJobsForEval({
          datasetEvalId: input.id,
          nodeEntryBaseQuery: kysely
            .selectFrom("NodeEntry as ne")
            .innerJoin("DataChannel as dc", (join) =>
              join
                .on("dc.destinationId", "=", datasetEval.dataset.nodeId)
                .onRef("dc.id", "=", "ne.dataChannelId"),
            )
            .where("ne.split", "=", "TEST")
            .where("ne.status", "=", "PROCESSED"),
        });
      }

      return success("Dataset eval updated");
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const { dataset } = await prisma.datasetEval.findUniqueOrThrow({
        where: { id: input.id },
        include: {
          dataset: true,
        },
      });
      await requireCanModifyProject(dataset.projectId, ctx);

      await prisma.datasetEval.delete({
        where: { id: input.id },
      });

      return success("Dataset eval deleted");
    }),

  getFieldComparisonDetails: protectedProcedure
    .input(z.object({ datasetEvalId: z.string(), nodeEntryId: z.string(), modelId: z.string() }))
    .query(async ({ input, ctx }) => {
      const datasetEval = await prisma.datasetEval.findUniqueOrThrow({
        where: {
          id: input.datasetEvalId,
        },
        include: {
          dataset: {
            select: {
              projectId: true,
            },
          },
        },
      });

      await requireCanViewProject(datasetEval.dataset.projectId, ctx);

      const entry = await kysely
        .selectFrom("NodeEntry as ne")
        .where("ne.id", "=", input.nodeEntryId)
        .innerJoin("DatasetEntryOutput as deo", "deo.hash", "ne.outputHash")
        .innerJoin("DatasetEvalNodeEntry as dene", (join) =>
          join
            .onRef("dene.nodeEntryPersistentId", "=", "ne.persistentId")
            .on("dene.datasetEvalId", "=", input.datasetEvalId),
        )
        .innerJoin("DatasetEvalResult as der", "der.datasetEvalNodeEntryId", "dene.id")
        .innerJoin("FineTuneTestingEntry as ftte", (join) =>
          join.onRef("ftte.inputHash", "=", "ne.inputHash").on("ftte.modelId", "=", input.modelId),
        )
        .innerJoin("DatasetEntryOutput as ftteDEO", "ftteDEO.hash", "ftte.outputHash")
        .leftJoin("FineTune as ft", "ft.id", "ftte.fineTuneId")
        .select([
          "ft.slug",
          "deo.output as originalOutput",
          "ftteDEO.output as output",
          "ftte.modelId",
          "der.score",
          "der.errorMessage",
        ])
        .executeTakeFirst();

      return { datasetEval, entry };
    }),

  getHeadToHeadComparisonDetails: protectedProcedure
    .input(
      z.object({
        datasetEvalId: z.string(),
        nodeEntryId: z.string(),
        modelId: z.string(),
        visibleModelIds: z.string().array(),
      }),
    )
    .query(async ({ input, ctx }) => {
      const evalResult = await kysely
        .selectFrom("NodeEntry as ne")
        .where("ne.id", "=", input.nodeEntryId)
        .innerJoin("DatasetEvalNodeEntry as dene", (join) =>
          join
            .onRef("dene.nodeEntryPersistentId", "=", "ne.persistentId")
            .on("dene.datasetEvalId", "=", input.datasetEvalId),
        )
        .innerJoin("DatasetEval as de", "de.id", "dene.datasetEvalId")
        .innerJoin("Dataset as d", "d.id", "de.datasetId")
        .leftJoin("DatasetEvalOutputSource as deos", (join) =>
          join
            .on("deos.datasetEvalId", "=", input.datasetEvalId)
            .on("deos.modelId", "=", input.modelId),
        )
        .leftJoin("DatasetEvalResult as selectedDer", (join) =>
          join
            .onRef("selectedDer.datasetEvalNodeEntryId", "=", "dene.id")
            .onRef("selectedDer.datasetEvalOutputSourceId", "=", "deos.id"),
        )
        .distinctOn("deos.modelId")
        .innerJoin("DatasetEntryInput as dei", "dei.hash", "ne.inputHash")
        .innerJoin("DatasetEntryOutput as deo", "deo.hash", "ne.outputHash")
        .leftJoin("FineTuneTestingEntry as ftte", (join) =>
          join
            .onRef("ftte.inputHash", "=", "ne.inputHash")
            .onRef("ftte.modelId", "=", "deos.modelId"),
        )
        .leftJoin("DatasetEntryOutput as ftteDEO", "ftteDEO.hash", "ftte.outputHash")
        .leftJoin("FineTune as ft", "ft.id", "ftte.fineTuneId")
        .select((eb) => [
          "d.projectId as projectId",
          "dei.messages as messages",
          "deo.output as originalOutput",
          "deos.modelId",
          "ftteDEO.output as output",
          "ft.slug as slug",
          "de.name as datasetEvalName",
          "de.instructions as datasetEvalInstructions",
          jsonArrayFrom(
            eb
              .selectFrom("DatasetEvalResult as der")
              .whereRef("der.datasetEvalNodeEntryId", "=", "dene.id")
              .whereRef("der.datasetEvalOutputSourceId", "=", "deos.id")
              .leftJoin(
                "DatasetEvalResult as comparisonDer",
                "comparisonDer.id",
                "der.comparisonResultId",
              )
              .leftJoin(
                "DatasetEvalOutputSource as comparisonDeos",
                "comparisonDeos.id",
                "comparisonDer.datasetEvalOutputSourceId",
              )
              .where("comparisonDeos.modelId", "in", input.visibleModelIds)
              .leftJoin("FineTuneTestingEntry as comparisonFtte", (join) =>
                join
                  .onRef("comparisonFtte.inputHash", "=", "ne.inputHash")
                  .onRef("comparisonFtte.modelId", "=", "comparisonDeos.modelId"),
              )
              .leftJoin(
                "DatasetEntryOutput as comparisonFtteDEO",
                "comparisonFtteDEO.hash",
                "comparisonFtte.outputHash",
              )
              .leftJoin("FineTune as comparisonFt", "comparisonFt.id", "comparisonFtte.fineTuneId")
              .orderBy("comparisonFt.createdAt", "desc")
              .select([
                "comparisonDer.score",
                "comparisonDer.explanation",
                "comparisonDer.wasFirst",
                "comparisonDer.status",
                "comparisonDer.errorMessage",
                "comparisonDeos.modelId",
                "comparisonFtteDEO.output as output",
                "comparisonFt.slug as slug",
              ]),
          ).as("comparisonResults"),
        ])
        .executeTakeFirst();

      if (!evalResult) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Result for head-to-head comparison details not found",
        });
      }

      await requireCanViewProject(evalResult.projectId, ctx);

      // fill in output for original model
      if (evalResult.modelId === ORIGINAL_MODEL_ID) {
        evalResult.output = evalResult.originalOutput;
      }
      const originalModelComparisonResult = evalResult.comparisonResults.find(
        (comparisonResult) => comparisonResult.modelId === ORIGINAL_MODEL_ID,
      );
      if (originalModelComparisonResult) {
        originalModelComparisonResult.output = evalResult.originalOutput;
      }

      // substitute model titles for placeholders in explanation
      const modelTitle = getModelTitle(evalResult);
      for (const comparisonResult of evalResult.comparisonResults) {
        if (!comparisonResult.explanation) continue;
        const comparisonModelTitle = getModelTitle(comparisonResult);

        const firstTitle = comparisonResult.wasFirst ? comparisonModelTitle : modelTitle;
        const secondTitle = comparisonResult.wasFirst ? modelTitle : comparisonModelTitle;

        comparisonResult.explanation = comparisonResult.explanation
          .replaceAll(RESPONSE_1_PLACEHOLDER, firstTitle)
          .replaceAll(RESPONSE_1_PLACEHOLDER.toLowerCase(), firstTitle)
          .replaceAll(RESPONSE_2_PLACEHOLDER, secondTitle)
          .replaceAll(RESPONSE_2_PLACEHOLDER.toLowerCase(), secondTitle);
      }

      return { evalResult };
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

      if (!dataset?.nodeId)
        throw new TRPCError({ message: "Dataset node does not exist", code: "NOT_FOUND" });

      const finishedCount = await kysely
        .selectFrom("NodeEntry as ne")
        .innerJoin("DataChannel as dc", (join) =>
          join.on("dc.destinationId", "=", dataset.nodeId).onRef("ne.dataChannelId", "=", "dc.id"),
        )
        .where("ne.split", "=", "TEST")
        .innerJoin("FineTuneTestingEntry as ftte", (join) =>
          join
            .onRef("ftte.inputHash", "=", "ne.inputHash")
            .on("ftte.modelId", "=", modelId)
            .on("ftte.outputHash", "is not", null),
        )
        .select([sql<number>`count(*)::int`.as("count")])
        .executeTakeFirst()
        .then((res) => res?.count ?? 0);

      const baseQuery = constructEvaluationFiltersQuery({ filters, nodeId: dataset.nodeId });

      let updatedPerformanceQuery = baseQuery;

      let i = 0;
      // Add average score for each dataset eval
      for (const datasetEval of dataset?.datasetEvals ?? []) {
        const alias = `eval${i++}`;
        updatedPerformanceQuery = updatedPerformanceQuery
          .leftJoin(
            (eb) =>
              eb
                .selectFrom(`DatasetEval as de`)
                .where("de.id", "=", datasetEval.id)
                .innerJoin("Dataset as d", "d.id", "de.datasetId")
                .innerJoin("DataChannel as dc", "dc.destinationId", "d.nodeId")
                .innerJoin("DatasetEvalNodeEntry as dene", "dene.datasetEvalId", "de.id")
                .innerJoin("NodeEntry as ne", (join) =>
                  join
                    .onRef("ne.persistentId", "=", "dene.nodeEntryPersistentId")
                    // include dataChannelId to make use of the [dataChannelId, persistentId] index
                    .onRef("ne.dataChannelId", "=", "dc.id"),
                )
                .leftJoin("DatasetEvalResult as der", (join) =>
                  join
                    .onRef("der.datasetEvalNodeEntryId", "=", "dene.id")
                    .onRef("der.nodeEntryInputHash", "=", "ne.inputHash"),
                )
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
                  "dene.nodeEntryPersistentId as persistentId",
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
                .groupBy(["dene.nodeEntryPersistentId"])
                .as(alias),
            (join) => join.onRef(`${alias}.persistentId`, "=", "ne.persistentId"),
          )
          .select((eb) => [
            eb.fn.agg<number>("AVG", [`${alias}.scoreForEval`]).as(`score_${datasetEval.id}`),
            sql.raw(`CAST(SUM(${alias}.wins) AS INT)`).as(`totalWins_${datasetEval.id}`),
            sql.raw(`CAST(SUM(${alias}.ties) AS INT)`).as(`totalTies_${datasetEval.id}`),
            sql.raw(`CAST(SUM(${alias}.losses) AS INT)`).as(`totalLosses_${datasetEval.id}`),
            sql.raw(`CAST(SUM(${alias}.pending) AS INT)`).as(`totalPending_${datasetEval.id}`),
            sql.raw(`CAST(SUM(${alias}.complete) AS INT)`).as(`totalComplete_${datasetEval.id}`),
            sql
              .raw(`CAST(COUNT(${alias}."persistentId") AS INT)`)
              .as(`totalCount_${datasetEval.id}`),
          ]) as unknown as typeof baseQuery;
      }

      const performance = await updatedPerformanceQuery
        .select("dc.destinationId")
        .groupBy("dc.destinationId")
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
        finishedCount,
        evalPerformances,
        resultsPending,
      };
    }),
});
