import { env } from "~/env.mjs";
import { prisma } from "~/server/db";
import { trainerv1 } from "~/server/modal-rpc/clients";
import { uploadTrainingDataFile as uploadJsonl } from "~/utils/azure/server";
import defineTask from "../defineTask";
import { trainOpenaiFineTune } from "./trainOpenaiFineTune";
import { CURRENT_PIPELINE_VERSION } from "~/types/shared.types";
import { serializeChatInput, serializeChatOutput } from "~/modelProviders/fine-tuned/serializers";
import { typedDatasetEntry } from "~/types/dbColumns.types";
import { truthyFilter } from "~/utils/utils";
import { getStringsToPrune, pruneInputMessages } from "~/utils/pruningRules";

export type TrainFineTuneJob = {
  fineTuneId: string;
};

export const trainFineTune = defineTask<TrainFineTuneJob>({
  id: "trainFineTune",
  handler: async (task) => {
    const fineTune = await prisma.fineTune.findUnique({
      where: { id: task.fineTuneId },
    });

    if (!fineTune) return;

    if (fineTune.baseModel === "GPT_3_5_TURBO") {
      await trainOpenaiFineTune(fineTune.id);
    } else {
      await trainModalFineTune(fineTune.id);
    }
  },
});

const trainModalFineTune = async (fineTuneId: string) => {
  const fineTune = await prisma.fineTune.findUnique({
    where: { id: fineTuneId },
    include: {
      dataset: {
        include: {
          datasetEntries: {
            select: {
              id: true,
              messages: true,
              function_call: true,
              functions: true,
              output: true,
            },
            where: { outdated: false, split: "TRAIN" },
          },
          pruningRules: {
            select: {
              id: true,
              textToMatch: true,
              tokensInText: true,
              matches: true,
            },
          },
        },
      },
    },
  });
  if (!fineTune) return;

  await prisma.fineTune.update({
    where: { id: fineTuneId },
    data: { status: "STARTED" },
  });

  // check whether there are already training entries, which probably means the
  // job restarted and we shouldn't recreate them.
  const trainingEntryCount = await prisma.fineTuneTrainingEntry.count({
    where: { fineTuneId: fineTune.id },
  });

  if (trainingEntryCount === 0) {
    await prisma.fineTuneTrainingEntry.createMany({
      data: fineTune.dataset.datasetEntries.map((datasetEntry) => ({
        fineTuneId: fineTune.id,
        datasetEntryId: datasetEntry.id,
      })),
    });
  }

  await prisma.$transaction(
    fineTune.dataset.pruningRules.map((rule) =>
      prisma.pruningRule.create({
        data: {
          fineTuneId: fineTune.id,
          textToMatch: rule.textToMatch,
          tokensInText: rule.tokensInText,
          matches: {
            create: rule.matches.map((match) => ({
              datasetEntryId: match.datasetEntryId,
            })),
          },
        },
      }),
    ),
  );

  const stringsToPrune = await getStringsToPrune(fineTune.id);

  const trainingRows = fineTune.dataset.datasetEntries
    .map((entry) => {
      const dsEntry = typedDatasetEntry(entry);
      if (!dsEntry.output) return null;
      return {
        instruction: serializeChatInput(
          {
            messages: pruneInputMessages(dsEntry.messages, stringsToPrune),
            tool_choice: dsEntry.tool_choice ?? undefined,
            tools: dsEntry.tools ?? undefined,
          },
          { pipelineVersion: CURRENT_PIPELINE_VERSION },
        ),
        output: serializeChatOutput(dsEntry.output),
      };
    })
    .filter(truthyFilter);

  await prisma.fineTune.update({
    where: { id: fineTuneId },
    data: {
      status: "TRANSFERRING_TRAINING_DATA",
    },
  });

  const blobName = await uploadJsonl(trainingRows);

  const huggingFaceModelId = `OpenPipe/ft-${env.NODE_ENV}-${fineTuneId}-${fineTune.slug}`;

  await prisma.fineTune.update({
    where: { id: fineTuneId },
    data: {
      status: "TRAINING",
      trainingBlobName: blobName,
      trainingStartedAt: new Date(),
      huggingFaceModelId,
    },
  });

  // When we kick off a training job the trainer needs to be able to report its
  // progress somewhere, and since the trainer will be running remotely on Modal
  // the callback URL needs to be a publicly available host.
  const callbackBaseUrl = (env.LOCAL_HOST_PUBLIC_URL ?? env.NEXT_PUBLIC_HOST) + "/api/internal/v1";

  try {
    const resp = await trainerv1.default.startTraining(fineTuneId, callbackBaseUrl);
    await prisma.fineTune.update({
      where: { id: fineTuneId },
      data: {
        status: "TRAINING",
        trainingStartedAt: new Date(),
        modalTrainingJobId: resp.call_id,
      },
    });
  } catch (e) {
    console.error("Failed to start training", e);
    await prisma.fineTune.update({
      where: { id: fineTuneId },
      data: {
        status: "ERROR",
      },
    });
  }
};
