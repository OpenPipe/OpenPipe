import { sql } from "kysely";
import { z } from "zod";
import { type Dataset } from "@prisma/client";
import { pick } from "lodash-es";

import { protectedProcedure } from "~/server/api/trpc";
import { kysely, prisma } from "~/server/db";
import { axolotlConfig } from "~/server/fineTuningProviders/openpipe/axolotlConfig";
import { baseModel } from "~/server/fineTuningProviders/types";
import { trainFineTune } from "~/server/tasks/fineTuning/trainFineTune.task";
import { constructNodeEntryFiltersQuery } from "~/server/utils/constructNodeEntryFiltersQuery";
import { copyPruningRulesForFineTune } from "~/server/utils/nodes/updatePruningRuleMatches";
import { CURRENT_PIPELINE_VERSION, filtersSchema } from "~/types/shared.types";
import { requireCanModifyProject } from "~/utils/accessControl";
import { posthogServerClient } from "~/utils/analytics/serverAnalytics";
import { isComparisonModelName } from "~/utils/comparisonModels";
import { error, success } from "~/utils/errorHandling/standardResponses";

const inputs = z.object({
  datasetId: z.string(),
  slug: z.string(),
  baseModel: baseModel,
  filters: filtersSchema,
  pruningRuleIds: z.array(z.string()),
  trainingConfigOverrides: axolotlConfig.partial().optional(),
});

export const createFineTune = async (
  input: Pick<
    z.infer<typeof inputs>,
    "slug" | "baseModel" | "filters" | "pruningRuleIds" | "trainingConfigOverrides"
  > & { dataset: Dataset; userId: string },
) => {
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
      projectId: input.dataset.projectId,
      slug: input.slug,
      provider: input.baseModel.provider,
      baseModel: input.baseModel.baseModel,
      datasetId: input.dataset.id,
      pipelineVersion: CURRENT_PIPELINE_VERSION,
      trainingConfigOverrides: input.trainingConfigOverrides,
      userId: input.userId,
    },
    include: {
      project: {
        select: { slug: true },
      },
    },
  });
  if (!fineTune) return error("Error creating fine tune");

  await copyPruningRulesForFineTune(fineTune.id, input.pruningRuleIds);

  posthogServerClient?.capture({
    distinctId: input.userId,
    event: "fine-tune-created",
    properties: {
      projectId: fineTune.projectId,
      projectSlug: fineTune.project.slug,
      datasetId: input.dataset.id,
      slug: input.slug,
      modelId: fineTune.id,
      baseModel: input.baseModel.baseModel,
    },
  });

  await kysely
    .insertInto("FineTuneTrainingEntry")
    .columns(["id", "nodeEntryPersistentId", "inputHash", "outputHash", "fineTuneId", "updatedAt"])
    .expression(() =>
      constructNodeEntryFiltersQuery({
        filters: input.filters,
        nodeId: input.dataset.nodeId,
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
  return fineTune;
};

export const createProcedure = protectedProcedure.input(inputs).mutation(async ({ input, ctx }) => {
  const dataset = await prisma.dataset.findUniqueOrThrow({
    where: { id: input.datasetId },
  });
  await requireCanModifyProject(dataset.projectId, ctx);

  const fineTune = await createFineTune({
    ...pick(input, ["slug", "baseModel", "filters", "pruningRuleIds", "trainingConfigOverrides"]),
    dataset,
    userId: ctx.session?.user?.id,
  });
  if (fineTune?.status === "error") {
    return error(fineTune.message);
  }

  return success({ fineTuneId: fineTune.id });
});
