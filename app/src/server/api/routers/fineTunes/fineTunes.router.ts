import { TRPCError } from "@trpc/server";
import { sql } from "kysely";
import { jsonArrayFrom } from "kysely/helpers/postgres";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { kysely, prisma } from "~/server/db";
import { axolotlConfig } from "~/server/fineTuningProviders/openpipe/axolotlConfig";
import { baseModel } from "~/server/fineTuningProviders/types";
import { trainFineTune } from "~/server/tasks/fineTuning/trainFineTune.task";
import { constructNodeEntryFiltersQuery } from "~/server/utils/constructNodeEntryFiltersQuery";
import { copyPruningRulesForFineTune } from "~/server/utils/nodes/updatePruningRuleMatches";
import { typedDatasetEntry, typedFineTune } from "~/types/dbColumns.types";
import { CURRENT_PIPELINE_VERSION, filtersSchema } from "~/types/shared.types";
import { requireCanModifyProject, requireCanViewProject } from "~/utils/accessControl";
import { captureFineTuneCreation } from "~/utils/analytics/serverAnalytics";
import { isComparisonModelName } from "~/utils/comparisonModels";
import { error, success } from "~/utils/errorHandling/standardResponses";
import { getExportWeightsRequest, requestExportWeights } from "./exportWeights";

export const fineTunesRouter = createTRPCRouter({
  list: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
      }),
    )
    .query(async ({ input, ctx }) => {
      const { projectId } = input;

      await requireCanViewProject(projectId, ctx);

      const fineTunes = await kysely
        .selectFrom("FineTune as ft")
        .where("ft.projectId", "=", projectId)
        .leftJoin("Dataset as d", "ft.datasetId", "d.id")
        .selectAll("ft")
        .select(() => [
          "d.name as datasetName",
          sql<number>`(select count(*) from "NewFineTuneTrainingEntry" where "fineTuneId" = ft.id)::int`.as(
            "numTrainingEntries",
          ),
        ])
        .orderBy("ft.createdAt", "desc")
        .execute();

      const count = await prisma.fineTune.count({
        where: {
          projectId,
        },
      });

      return {
        fineTunes: fineTunes.map(typedFineTune),
        count,
      };
    }),
  listForDataset: protectedProcedure
    .input(
      z.object({
        datasetId: z.string(),
      }),
    )
    .query(async ({ input, ctx }) => {
      const { datasetId } = input;

      const dataset = await prisma.dataset.findUnique({
        where: {
          id: datasetId,
        },
      });

      if (!dataset) throw new TRPCError({ message: "Dataset not found", code: "NOT_FOUND" });
      await requireCanViewProject(dataset?.projectId, ctx);

      const fineTunes = await kysely
        .selectFrom("Dataset as d")
        .where("d.id", "=", datasetId)
        .innerJoin("FineTune as ft", "ft.datasetId", "d.id")
        .selectAll()
        .select(() => [
          sql<number>`(select count(*) from "NewFineTuneTrainingEntry" where "fineTuneId" = ft.id)::int`.as(
            "numTrainingEntries",
          ),
          sql<number>`(select count(*) from "NodeEntry" where "nodeId" = d."nodeId" and "split" = 'TEST' and "status" = 'PROCESSED')::int`.as(
            "numTestingEntries",
          ),
          sql<number>`(select count(*) from "PruningRule" where "fineTuneId" = ft.id)::int`.as(
            "numPruningRules",
          ),
        ])
        .orderBy("ft.createdAt", "desc")
        .execute();

      return fineTunes.map(typedFineTune);
    }),
  get: protectedProcedure
    .input(
      z.object({
        id: z.string(),
      }),
    )
    .query(async ({ input, ctx }) => {
      const fineTune = await kysely
        .selectFrom("FineTune as ft")
        .where("ft.id", "=", input.id)
        .innerJoin("Dataset as d", "ft.datasetId", "d.id")
        .select("d.name as datasetName")
        .selectAll("ft")
        .select((eb) => [
          sql<number>`(select count(*) from "NewFineTuneTrainingEntry" where "fineTuneId" = ft.id)::int`.as(
            "numTrainingEntries",
          ),
          sql<number>`(select count(*) from "NodeEntry" where "nodeId" = d."nodeId" and "split" = 'TEST' and "status" = 'PROCESSED')::int`.as(
            "numTestingEntries",
          ),
          jsonArrayFrom(
            eb
              .selectFrom("PruningRule")
              .select(["id", "textToMatch", "tokensInText"])
              .whereRef("fineTuneId", "=", "ft.id")
              .orderBy("createdAt", "asc"),
          ).as("pruningRules"),
        ])
        .executeTakeFirst();

      if (!fineTune) throw new TRPCError({ message: "Fine tune not found", code: "NOT_FOUND" });

      await requireCanViewProject(fineTune.projectId, ctx);

      return typedFineTune(fineTune);
    }),
  create: protectedProcedure
    .input(
      z.object({
        datasetId: z.string(),
        slug: z.string(),
        baseModel: baseModel,
        filters: filtersSchema,
        pruningRuleIds: z.array(z.string()),
        trainingConfigOverrides: axolotlConfig.partial().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const dataset = await prisma.dataset.findUnique({
        where: {
          id: input.datasetId,
        },
        include: {
          pruningRules: true,
        },
      });

      const datasetNodeId = dataset?.nodeId;

      if (!datasetNodeId) return error("Dataset node not found");

      await requireCanModifyProject(dataset.projectId, ctx);

      if (isComparisonModelName(input.slug)) {
        return error("Fine tune IDs cannot match any base model names");
      }

      const existingFineTune = await prisma.fineTune.findFirst({
        where: { slug: input.slug },
      });

      if (existingFineTune) {
        return error("Fine tune IDs have to be globally unique. Please choose a different ID.");
      }

      const fineTune = await prisma.fineTune.create({
        data: {
          projectId: dataset.projectId,
          slug: input.slug,
          provider: input.baseModel.provider,
          baseModel: input.baseModel.baseModel,
          datasetId: input.datasetId,
          pipelineVersion: CURRENT_PIPELINE_VERSION,
          trainingConfigOverrides: input.trainingConfigOverrides,
        },
        include: {
          project: {
            select: { slug: true },
          },
        },
      });
      if (!fineTune) return error("Error creating fine tune");

      await copyPruningRulesForFineTune(fineTune.id, input.pruningRuleIds);

      captureFineTuneCreation(
        ctx.session,
        fineTune.projectId,
        fineTune.project.slug,
        input.datasetId,
        input.slug,
        fineTune.id,
        input.baseModel.baseModel,
      );

      await kysely
        .insertInto("NewFineTuneTrainingEntry")
        .columns(["id", "persistentId", "inputHash", "outputHash", "fineTuneId", "updatedAt"])
        .expression(() =>
          constructNodeEntryFiltersQuery({
            filters: input.filters,
            datasetNodeId,
          })
            .where("split", "=", "TRAIN")
            .where("status", "=", "PROCESSED")
            .select([
              sql`uuid_generate_v4()`.as("id"),
              "persistentId",
              "inputHash",
              "outputHash",
              sql`${fineTune.id}`.as("fineTuneId"),
              sql`now()`.as("updatedAt"),
            ]),
        )
        .execute();

      await trainFineTune.enqueue({ fineTuneId: fineTune.id });

      return success({ fineTuneId: fineTune.id });
    }),
  restartTraining: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const fineTune = await prisma.fineTune.findUnique({
        where: { id: input.id },
      });

      if (!fineTune) return error("Fine tune not found");
      await requireCanModifyProject(fineTune.projectId, ctx);

      await prisma.fineTune.update({
        where: { id: input.id },
        data: {
          status: "PENDING",
          errorMessage: null,
          createdAt: new Date(),
        },
      });

      await trainFineTune.enqueue({ fineTuneId: fineTune.id });

      return success();
    }),
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        slug: z.string(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const fineTune = await prisma.fineTune.findUnique({
        where: {
          id: input.id,
        },
      });

      if (!fineTune) return error("Fine tune not found");
      await requireCanModifyProject(fineTune.projectId, ctx);

      if (isComparisonModelName(input.slug)) {
        return error("Fine tune IDs cannot match any base model names");
      }

      const existingFineTune = await prisma.fineTune.findFirst({
        where: {
          slug: input.slug,
        },
      });

      if (existingFineTune) return error("A fine tune with that slug already exists");

      await prisma.fineTune.update({
        where: {
          id: input.id,
        },
        data: {
          slug: input.slug,
        },
      });

      return success("Fine tune updated");
    }),
  delete: protectedProcedure
    .input(
      z.object({
        id: z.string(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const fineTune = await prisma.fineTune.findUnique({
        where: {
          id: input.id,
        },
      });

      if (!fineTune) return error("Fine tune not found");
      await requireCanModifyProject(fineTune.projectId, ctx);

      await prisma.fineTune.delete({
        where: {
          id: input.id,
        },
      });

      await prisma.datasetEvalOutputSource.deleteMany({
        where: {
          modelId: input.id,
        },
      });

      return success("Fine tune deleted");
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

      const entries = await kysely
        .selectFrom("NewFineTuneTrainingEntry as ftte")
        .where("ftte.fineTuneId", "=", fineTuneId)
        .innerJoin("DatasetEntryInput as dei", "ftte.inputHash", "dei.hash")
        .innerJoin("DatasetEntryOutput as deo", "ftte.outputHash", "deo.hash")
        .selectAll("ftte")
        .select([
          "ftte.id",
          "ftte.inputHash",
          "ftte.outputHash",
          "ftte.createdAt",
          "dei.messages",
          "dei.tool_choice",
          "dei.tools",
          "dei.inputTokens",
          "deo.output",
          "deo.outputTokens",
        ])
        .orderBy("ftte.createdAt", "desc")
        .limit(pageSize)
        .offset((page - 1) * pageSize)
        .execute();

      const count = await prisma.newFineTuneTrainingEntry.count({
        where: {
          fineTuneId: fineTuneId,
        },
      });

      const typedEntries = entries.map((entry) => typedDatasetEntry(entry));

      return {
        entries: typedEntries,
        count,
      };
    }),
  getExportWeightsRequest,
  requestExportWeights,
});
