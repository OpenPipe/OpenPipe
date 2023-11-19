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

export const datasetEvalsRouter = createTRPCRouter({
  get: protectedProcedure.input(z.object({ id: z.string() })).query(async ({ input, ctx }) => {
    const datasetEvals = await kysely
      .selectFrom("DatasetEval as de")
      .where("id", "=", input.id)
      .leftJoin("Dataset as d", "d.id", "de.datasetId")
      .leftJoin("DatasetEvalDatasetEntry as dede", "dede.datasetEvalId", "de.id")
      .select((eb) => [
        "de.name",
        "de.instructions",
        "d.projectId",
        jsonArrayFrom(
          eb
            .selectFrom("DatasetEvalOutputSource")
            .where("datasetEvalId", "=", input.id)
            .select(["id", "modelId"])
            .orderBy("id", "asc"),
        ).as("outputSources"),
        eb.fn.count<number>("dede.id").as("numDatasetEntries"),
      ])
      .groupBy("de.id")
      .execute();

    const datasetEval = datasetEvals[0];
    if (!datasetEval?.projectId)
      throw new TRPCError({ message: "Dataset eval not found", code: "NOT_FOUND" });

    await requireCanViewProject(datasetEval.projectId, ctx);

    return datasetEval;
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

      console.log("shuffledEntryIds", shuffledEntryIds);

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
        console.log("datasetEval", datasetEval);
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
      const { dataset } = await prisma.datasetEval.findUniqueOrThrow({
        where: { id: input.id },
        include: {
          dataset: true,
        },
      });
      await requireCanModifyProject(dataset.projectId, ctx);

      const numTestDatasetEntries = await prisma.datasetEntry.count({
        where: { datasetId: dataset.id, split: "TEST" },
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

      if (input.updates.instructions) {
        await kysely
          .deleteFrom("DatasetEvalResult as der")
          .innerJoin("DatasetEvalOutputSource as deos", "deos.id", "der.datasetEvalOutputSourceId")
          .where("deos.datasetEvalId", "=", input.id)
          .execute();
        await queueEvalJobsForEval(input.id);
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
        await queueEvalJobsForEval(input.id);
      }

      if (input.updates.numDatasetEntries) {
        const currentNumDatasetEntries = await prisma.datasetEvalDatasetEntry.count({
          where: { datasetEvalId: input.id },
        });
        if (currentNumDatasetEntries >= input.updates.numDatasetEntries) {
          const currentDatasetEvalDatasetEntries = await prisma.datasetEvalDatasetEntry.findMany({
            where: { datasetEvalId: input.id },
            select: { id: true },
          });

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
            .selectFrom("DatasetEntry")
            .where("datasetId", "=", dataset.id)
            .where("split", "=", "TEST")
            .where("outdated", "=", false)
            .leftJoin(
              "DatasetEvalDatasetEntry",
              "DatasetEvalDatasetEntry.datasetEntryId",
              "DatasetEntry.id",
            )
            .where("DatasetEvalDatasetEntry.id", "is", null)
            .select("DatasetEntry.id")
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

  getComparisonDetails: protectedProcedure
    .input(z.object({ datasetEvalId: z.string(), datasetEntryId: z.string(), modelId: z.string() }))
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

      const entries = await kysely
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
                "comparisonDeos.modelId",
                "comparisonFtte.output as output",
                "comparisonFt.slug as slug",
              ]),
          ).as("comparisonResults"),
        ])
        .execute();

      const entry = entries[0];

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
