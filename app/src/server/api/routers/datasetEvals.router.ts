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
    const datasetNodeId = await kysely
      .selectFrom("DatasetEval")
      .where("id", "=", input.id)
      .innerJoin("Dataset as d", "d.id", "DatasetEval.datasetId")
      .select("d.nodeId")
      .executeTakeFirst()
      .then((row) => row?.nodeId);

    if (!datasetNodeId) {
      throw new TRPCError({ message: "Dataset eval not node found", code: "NOT_FOUND" });
    }

    const datasetEval = await kysely
      .selectFrom("DatasetEval as eval")
      .where("eval.id", "=", input.id)
      .leftJoin("Dataset as d", "d.id", "eval.datasetId")
      .leftJoin("DatasetEvalDatasetEntry as dede", "dede.datasetEvalId", "eval.id")
      .innerJoin("NodeData as nd", (join) =>
        join
          .onRef("nd.nodeId", "=", "d.nodeId")
          .onRef("nd.importId", "=", "dede.importId")
          .onRef("nd.inputHash", "=", "dede.inputHash")
          .on("nd.split", "=", "TEST")
          .on("nd.status", "=", "PROCESSED"),
      )
      .distinctOn(["nd.importId", "nd.inputHash"])
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
      .innerJoin("NodeData as nd", (join) =>
        join
          .on("nd.nodeId", "=", datasetNodeId)
          .onRef("nd.importId", "=", "dede.importId")
          .onRef("nd.inputHash", "=", "dede.inputHash")
          .on("nd.split", "=", "TEST")
          .on("nd.status", "=", "PROCESSED"),
      )
      .distinctOn(["nd.importId", "nd.inputHash"])
      .leftJoin("FineTune as ft", (join) => join.onRef(sql`ft.id::text`, "=", "deos.modelId"))
      .where("nd.status", "=", "PROCESSED")
      .where("nd.split", "=", "TEST")
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
        .innerJoin("NodeData as nd", (join) =>
          join
            .onRef("nd.nodeId", "=", "d.nodeId")
            .onRef("nd.importId", "=", "dede.importId")
            .onRef("nd.inputHash", "=", "dede.inputHash")
            .on("nd.split", "=", "TEST")
            .on("nd.status", "=", "PROCESSED"),
        )
        .distinctOn(["nd.importId", "nd.inputHash"])
        .select((eb) => [
          "eval.id",
          "eval.name",
          "eval.instructions",
          "eval.createdAt",
          "d.id as datasetId",
          "d.name as datasetName",
          "d.projectId",
          "modelsSubquery.numModels",
          eb.fn.count<string>("dede.id").as("numRows"),
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

      const testNodeData = await kysely
        .selectFrom("NodeData")
        .where("nodeId", "=", dataset.nodeId)
        .where("split", "=", "TEST")
        .where("status", "=", "PROCESSED")
        .distinctOn(["importId", "inputHash"])
        .select(["importId", "inputHash"])
        .execute();

      if (testNodeData.length < input.numRows) {
        return error(
          `The test set only has ${testNodeData.length} distinct entries, but ${input.numRows} were requested`,
        );
      }

      const shuffledNodeData = shuffle(testNodeData).slice(0, input.numRows);

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
              create: shuffledNodeData,
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

      const numTestNodeData = await kysely
        .selectFrom("NodeData")
        .where("nodeId", "=", datasetEval.dataset.nodeId)
        .where("split", "=", "TEST")
        .where("status", "=", "PROCESSED")
        .distinctOn(["importId", "inputHash"])
        .select((eb) => [eb.fn.count<string>("importId").as("numRows")])
        .executeTakeFirst()
        .then((row) => parseInt(row?.numRows ?? "0"));

      if (input.updates.numRows && numTestNodeData < input.updates.numRows) {
        return error(
          `The test set only has ${numTestNodeData} distinct entries, but ${input.updates.numRows} were requested`,
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
        .innerJoin("NodeData as nd", (join) =>
          join
            .on("nd.nodeId", "=", datasetEval.dataset.nodeId)
            .onRef("nd.importId", "=", "dede.importId")
            .onRef("nd.inputHash", "=", "dede.inputHash")
            .on("nd.split", "=", "TEST")
            .on("nd.status", "=", "PROCESSED"),
        )
        .distinctOn(["nd.importId", "nd.inputHash"])
        .select("dede.id")
        .execute();

      const currentNumRows = currentDatasetEvalDatasetEntries.length;

      if (input.updates.numRows && input.updates.numRows !== currentNumRows) {
        if (currentNumRows > input.updates.numRows) {
          const numRowsToDelete = currentNumRows - input.updates.numRows;

          const datasetEvalDatasetEntriesToDelete = shuffle(
            currentDatasetEvalDatasetEntries.map((entry) => entry.id),
          ).slice(0, numRowsToDelete);

          await kysely
            .deleteFrom("DatasetEvalDatasetEntry")
            .where("id", "in", datasetEvalDatasetEntriesToDelete)
            .execute();
        } else {
          const currentlyExcludedNodeData = await kysely
            .selectFrom("NodeData as nd")
            .where("nodeId", "=", datasetEval.dataset.nodeId)
            .where("split", "=", "TEST")
            .where("status", "=", "PROCESSED")
            .leftJoin("DatasetEvalDatasetEntry as dede", (join) =>
              join
                .onRef("dede.importId", "=", "nd.importId")
                .onRef("dede.inputHash", "=", "nd.inputHash")
                .on("dede.datasetEvalId", "=", input.id),
            )
            .where("dede.id", "is", null)
            .select(["nd.importId", "nd.inputHash"])
            .execute();

          const numRowsToCreate = input.updates.numRows - currentNumRows;

          const nodeDataToCreate = shuffle(currentlyExcludedNodeData).slice(0, numRowsToCreate);

          await prisma.datasetEvalDatasetEntry.createMany({
            data: nodeDataToCreate.map((nodeData) => ({
              datasetEvalId: input.id,
              ...nodeData,
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
    .input(z.object({ datasetEvalId: z.string(), nodeDataId: z.string(), modelId: z.string() }))
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

      const row = await kysely
        .selectFrom("NodeData as nd")
        .where("nd.id", "=", input.nodeDataId)
        .innerJoin("DatasetEntryOutput as deo", "deo.hash", "nd.originalOutputHash")
        .leftJoin("DatasetEvalDatasetEntry as dede", (join) =>
          join
            .onRef("dede.importId", "=", "nd.importId")
            .onRef("dede.inputHash", "=", "nd.inputHash"),
        )
        .where("dede.datasetEvalId", "=", input.datasetEvalId)
        .leftJoin("DatasetEvalResult as der", "der.datasetEvalDatasetEntryId", "dede.id")
        .leftJoin("DatasetEvalOutputSource as deos", "deos.id", "der.datasetEvalOutputSourceId")
        .where("deos.modelId", "=", input.modelId)
        .leftJoin("FineTuneTestingEntry as ftte", "ftte.inputHash", "nd.inputHash")
        .where("ftte.modelId", "=", input.modelId)
        .leftJoin("FineTune as ft", "ft.id", "ftte.fineTuneId")
        .select([
          "ft.slug",
          "deo.output as originalOutput",
          "ftte.output as output",
          "ftte.modelId",
          "der.score",
          "der.errorMessage",
        ])
        .executeTakeFirst();

      return { datasetEval, row };
    }),

  getHeadToHeadComparisonDetails: protectedProcedure
    .input(
      z.object({
        datasetEvalId: z.string(),
        inputHash: z.string(),
        importId: z.string(),
        modelId: z.string(),
        visibleModelIds: z.string().array(),
      }),
    )
    .query(async ({ input, ctx }) => {
      const entry = await kysely
        .selectFrom("DatasetEvalDatasetEntry as dede")
        .where("dede.datasetEvalId", "=", input.datasetEvalId)
        .where("dede.importId", "=", input.importId)
        .where("dede.inputHash", "=", input.inputHash)
        .innerJoin("DatasetEval as de", "de.id", "dede.datasetEvalId")
        .innerJoin("Dataset as d", "d.id", "de.datasetId")
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
        .innerJoin("NodeData as nd", (join) =>
          join
            .onRef("nd.nodeId", "=", "d.nodeId")
            .onRef("nd.importId", "=", "dede.importId")
            .onRef("nd.inputHash", "=", "dede.inputHash")
            .on("nd.split", "=", "TEST")
            .on("nd.status", "=", "PROCESSED"),
        )
        .distinctOn(["nd.importId", "nd.inputHash"])
        .innerJoin("DatasetEntryInput as dei", "dei.hash", "nd.inputHash")
        .innerJoin("DatasetEntryOutput as deo", "deo.hash", "nd.originalOutputHash")
        .leftJoin("FineTuneTestingEntry as ftte", (join) =>
          join
            .on("ftte.inputHash", "=", input.inputHash)
            .onRef("ftte.modelId", "=", "deos.modelId"),
        )
        .leftJoin("FineTune as ft", "ft.id", "ftte.fineTuneId")
        .select((eb) => [
          "d.projectId as projectId",
          "dei.messages as messages",
          "deo.output as originalOutput",
          "deos.modelId",
          "ftte.output as output",
          "ft.slug as slug",
          "de.instructions as datasetEvalInstructions",
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
                  .on("comparisonFtte.inputHash", "=", input.inputHash)
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

      await requireCanViewProject(entry.projectId, ctx);

      // fill in output for original model
      if (entry.modelId === ORIGINAL_MODEL_ID) {
        entry.output = entry.originalOutput;
      }
      const originalModelComparisonResult = entry.comparisonResults.find(
        (result) => result.modelId === ORIGINAL_MODEL_ID,
      );
      if (originalModelComparisonResult) {
        originalModelComparisonResult.output = entry.originalOutput;
      }

      return entry;
    }),
});
