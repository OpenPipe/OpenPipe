import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { kysely, prisma } from "~/server/db";
import { requireCanModifyProject, requireCanViewProject } from "~/utils/accessControl";
import { error, success } from "~/utils/errorHandling/standardResponses";

import { queueEvalJobsForEval } from "~/server/tasks/evaluateTestSetEntries.task";
import { shuffle } from "lodash-es";
import { jsonArrayFrom } from "kysely/helpers/postgres";
import { TRPCError } from "@trpc/server";
import { ORIGINAL_MODEL_ID } from "~/types/dbColumns.types";
import { sql } from "kysely";

export const datasetEvalsRouter = createTRPCRouter({
  get: protectedProcedure.input(z.object({ id: z.string() })).query(async ({ input, ctx }) => {
    const datasetEval = await kysely
      .selectFrom("DatasetEval as eval")
      .where("eval.id", "=", input.id)
      .leftJoin("Dataset as d", "d.id", "eval.datasetId")
      .leftJoin("DatasetEvalDatasetEntry as dede", "dede.datasetEvalId", "eval.id")
      .leftJoin("DatasetEntry as de", "de.id", "dede.datasetEntryId")
      .where("de.split", "=", "TEST")
      .where("de.outdated", "=", false)
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
        eb.fn.count<string>("dede.id").as("numDatasetEntries"),
      ])
      .groupBy(["eval.id", "d.name", "d.projectId"])
      .executeTakeFirst();

    if (!datasetEval?.projectId)
      throw new TRPCError({ message: "Dataset eval not found", code: "NOT_FOUND" });

    await requireCanViewProject(datasetEval.projectId, ctx);

    const resultsBaseQuery = kysely
      .selectFrom("DatasetEvalOutputSource as deos")
      .innerJoin("DatasetEvalResult as der", "der.datasetEvalOutputSourceId", "deos.id")
      .innerJoin("DatasetEvalDatasetEntry as dede", "dede.id", "der.datasetEvalDatasetEntryId")
      .innerJoin("DatasetEntry as de", "de.id", "dede.datasetEntryId")
      .leftJoin("FineTune as ft", (join) => join.onRef(sql`ft.id::text`, "=", "deos.modelId"))
      .where("de.outdated", "=", false)
      .where("dede.datasetEvalId", "=", input.id);

    const [leaderboard, headToHead, completionCount] = await Promise.all([
      resultsBaseQuery
        .select((eb) => [
          "deos.modelId as modelId1",
          "ft.slug as slug1",
          eb.fn.avg<number>("der.score").as("winRate"),
          sql<number>`count(case when der.score = 1 then 1 end)::int`.as("wins"),
          sql<number>`count(case when der.score = .5 then 1 end)::int`.as("ties"),
          sql<number>`count(case when der.score = 0 then 1 end)::int`.as("losses"),
        ])
        .groupBy(["modelId1", "slug1"])
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
      numDatasetEntries: parseInt(datasetEval.numDatasetEntries),
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
        .leftJoin("DatasetEvalDatasetEntry as dede", "dede.datasetEvalId", "eval.id")
        .leftJoin("DatasetEntry as de", "de.id", "dede.datasetEntryId")
        .where("de.split", "=", "TEST")
        .where("de.outdated", "=", false)
        .select((eb) => [
          "eval.id",
          "eval.name",
          "eval.instructions",
          "eval.createdAt",
          "d.id as datasetId",
          "d.name as datasetName",
          "d.projectId",
          "modelsSubquery.numModels",
          eb.fn.count<string>("dede.id").as("numDatasetEntries"),
        ])
        .groupBy(["modelsSubquery.numModels", "eval.id", "d.id", "d.projectId"])
        .orderBy("eval.createdAt", "desc")
        .execute();

      return datasetEvals.map((datasetEval) => ({
        ...datasetEval,
        numDatasetEntries: parseInt(datasetEval.numDatasetEntries),
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
        numDatasetEntries: z.number(),
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

      const testDatasetEntries = await prisma.datasetEntry.findMany({
        where: {
          datasetId: input.datasetId,
          split: "TEST",
          outdated: false,
        },
        select: {
          id: true,
        },
      });

      if (testDatasetEntries.length < input.numDatasetEntries) {
        return error(
          `The test set only has ${testDatasetEntries.length} entries, but ${input.numDatasetEntries} were requested`,
        );
      }

      const shuffledEntryIds = shuffle(testDatasetEntries.map((entry) => entry.id)).slice(
        0,
        input.numDatasetEntries,
      );

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
            datasetEvalDatasetEntries: {
              create: shuffledEntryIds.map((datasetEntryId) => ({
                datasetEntryId,
              })),
            },
          },
          include: {
            datasetEvalOutputSources: true,
            datasetEvalDatasetEntries: true,
          },
        });

        await queueEvalJobsForEval(datasetEval.id);
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
          numDatasetEntries: z.number().optional(),
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

      let shouldQueueEvalJobs = false;

      const numTestDatasetEntries = await prisma.datasetEntry.count({
        where: { datasetId: datasetEval.dataset.id, split: "TEST", outdated: false },
      });
      if (
        input.updates.numDatasetEntries &&
        numTestDatasetEntries < input.updates.numDatasetEntries
      ) {
        return error(
          `The test set only has ${numTestDatasetEntries} entries, but ${input.updates.numDatasetEntries} were requested`,
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
        const currentModels = await prisma.datasetEvalOutputSource.findMany({
          where: { datasetEvalId: input.id },
          select: { modelId: true },
        });

        const modelIdsToDelete = currentModels
          .map((model) => model.modelId)
          .filter((modelId) => !updatedModelIds.includes(modelId));
        await prisma.datasetEvalOutputSource.deleteMany({
          where: {
            datasetEvalId: input.id,
            modelId: { in: modelIdsToDelete },
          },
        });

        const modelIdsToAdd = updatedModelIds.filter(
          (modelId) => !currentModels.map((model) => model.modelId).includes(modelId),
        );
        await prisma.datasetEvalOutputSource.createMany({
          data: modelIdsToAdd.map((modelId) => ({
            datasetEvalId: input.id,
            modelId,
          })),
        });
        if (modelIdsToAdd.length || modelIdsToDelete.length) shouldQueueEvalJobs = true;
      }

      const currentDatasetEvalDatasetEntries = await kysely
        .selectFrom("DatasetEvalDatasetEntry as dede")
        .where("dede.datasetEvalId", "=", input.id)
        .leftJoin("DatasetEntry as de", "de.id", "dede.datasetEntryId")
        .where("de.split", "=", "TEST")
        .where("de.outdated", "=", false)
        .select("dede.id")
        .execute();

      const currentNumDatasetEntries = currentDatasetEvalDatasetEntries.length;

      if (
        input.updates.numDatasetEntries &&
        input.updates.numDatasetEntries !== currentNumDatasetEntries
      ) {
        if (currentNumDatasetEntries > input.updates.numDatasetEntries) {
          const numEntriesToDelete = currentNumDatasetEntries - input.updates.numDatasetEntries;

          const datasetEvalDatasetEntriesToDelete = shuffle(
            currentDatasetEvalDatasetEntries.map((entry) => entry.id),
          ).slice(0, numEntriesToDelete);

          await kysely
            .deleteFrom("DatasetEvalDatasetEntry")
            .where("id", "in", datasetEvalDatasetEntriesToDelete)
            .execute();
        } else {
          const currentlyExcludedDatasetEntries = await kysely
            .selectFrom("DatasetEntry as de")
            .where("datasetId", "=", datasetEval.dataset.id)
            .where("split", "=", "TEST")
            .where("outdated", "=", false)
            .leftJoin("DatasetEvalDatasetEntry as dede", (join) =>
              join
                .onRef("dede.datasetEntryId", "=", "de.id")
                .on("dede.datasetEvalId", "=", input.id),
            )
            .where("dede.id", "is", null)
            .select("de.id")
            .execute();

          const numEntriesToCreate = input.updates.numDatasetEntries - currentNumDatasetEntries;

          const datasetEntryIdsToCreate = shuffle(
            currentlyExcludedDatasetEntries.map((entry) => entry.id),
          ).slice(0, numEntriesToCreate);

          await prisma.datasetEvalDatasetEntry.createMany({
            data: datasetEntryIdsToCreate.map((datasetEntryId) => ({
              datasetEvalId: input.id,
              datasetEntryId,
            })),
          });
        }

        shouldQueueEvalJobs = true;
      }

      if (shouldQueueEvalJobs) {
        await queueEvalJobsForEval(input.id);
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
    .input(z.object({ datasetEvalId: z.string(), datasetEntryId: z.string(), modelId: z.string() }))
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
        .selectFrom("DatasetEntry as de")
        .where("de.id", "=", input.datasetEntryId)
        .leftJoin("DatasetEvalDatasetEntry as dede", "dede.datasetEntryId", "de.id")
        .where("dede.datasetEvalId", "=", input.datasetEvalId)
        .leftJoin("DatasetEvalResult as der", "der.datasetEvalDatasetEntryId", "dede.id")
        .leftJoin("DatasetEvalOutputSource as deos", "deos.id", "der.datasetEvalOutputSourceId")
        .where("deos.modelId", "=", input.modelId)
        .leftJoin("FineTuneTestingEntry as ftte", "ftte.datasetEntryId", "de.id")
        .where("ftte.modelId", "=", input.modelId)
        .leftJoin("FineTune as ft", "ft.id", "ftte.fineTuneId")
        .select([
          "ft.slug",
          "de.output as originalOutput",
          "ftte.output as output",
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
        datasetEntryId: z.string(),
        modelId: z.string(),
        visibleModelIds: z.string().array(),
      }),
    )
    .query(async ({ input, ctx }) => {
      const datasetEvalDatasetEntry = await prisma.datasetEvalDatasetEntry.findUniqueOrThrow({
        where: {
          datasetEvalId_datasetEntryId: {
            datasetEvalId: input.datasetEvalId,
            datasetEntryId: input.datasetEntryId,
          },
        },
        select: {
          id: true,
          datasetEntry: {
            select: {
              output: true,
              dataset: {
                select: {
                  projectId: true,
                },
              },
            },
          },
          datasetEval: {
            select: {
              id: true,
              name: true,
              instructions: true,
            },
          },
        },
      });

      await requireCanViewProject(datasetEvalDatasetEntry.datasetEntry.dataset.projectId, ctx);

      const entry = await kysely
        .selectFrom("DatasetEvalDatasetEntry as dede")
        .where("dede.datasetEvalId", "=", input.datasetEvalId)
        .where("dede.datasetEntryId", "=", input.datasetEntryId)
        .leftJoin(
          "DatasetEvalResult as selectedDer",
          "selectedDer.datasetEvalDatasetEntryId",
          "dede.id",
        )
        .leftJoin(
          "DatasetEvalOutputSource as deos",
          "deos.id",
          "selectedDer.datasetEvalOutputSourceId",
        )
        .where("deos.modelId", "=", input.modelId)
        .distinctOn("deos.modelId")
        .leftJoin("DatasetEntry as de", "de.id", "dede.datasetEntryId")
        .leftJoin("FineTuneTestingEntry as ftte", (join) =>
          join
            .on("ftte.datasetEntryId", "=", input.datasetEntryId)
            .onRef("ftte.modelId", "=", "deos.modelId"),
        )
        .leftJoin("FineTune as ft", "ft.id", "ftte.fineTuneId")
        .select((eb) => [
          "de.messages as messages",
          "deos.modelId",
          "ftte.output as output",
          "ft.slug as slug",
          jsonArrayFrom(
            eb
              .selectFrom("DatasetEvalResult as der")
              .whereRef("der.datasetEvalDatasetEntryId", "=", "dede.id")
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
                  .on("comparisonFtte.datasetEntryId", "=", input.datasetEntryId)
                  .onRef("comparisonFtte.modelId", "=", "comparisonDeos.modelId"),
              )
              .leftJoin("FineTune as comparisonFt", "comparisonFt.id", "comparisonFtte.fineTuneId")
              .orderBy("comparisonFt.createdAt", "desc")
              .select([
                "comparisonDer.score",
                "comparisonDer.explanation",
                "comparisonDer.status",
                "comparisonDer.errorMessage",
                "comparisonDeos.modelId",
                "comparisonFtte.output as output",
                "comparisonFt.slug as slug",
              ]),
          ).as("comparisonResults"),
        ])
        .executeTakeFirst();

      if (!entry) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Dataset entry for head-to-head comparison details not found",
        });
      }

      // fill in output for original model
      if (entry.modelId === ORIGINAL_MODEL_ID) {
        entry.output = datasetEvalDatasetEntry.datasetEntry.output;
      }
      const originalModelComparisonResult = entry.comparisonResults.find(
        (result) => result.modelId === ORIGINAL_MODEL_ID,
      );
      if (originalModelComparisonResult) {
        originalModelComparisonResult.output = datasetEvalDatasetEntry.datasetEntry.output;
      }

      return {
        entry,
        datasetEval: datasetEvalDatasetEntry.datasetEval,
        originalOutput: datasetEvalDatasetEntry?.datasetEntry?.output,
      };
    }),
});
