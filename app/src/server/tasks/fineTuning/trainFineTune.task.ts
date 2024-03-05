import { captureException } from "@sentry/node";
import { from } from "ix/asynciterable";
import { filter, map } from "ix/asynciterable/operators";
import { toNodeStream } from "ix/asynciterable/tonodestream";

import { env } from "~/env.mjs";
import { kysely, prisma } from "~/server/db";
import { callbackBaseUrl, trainerv1 } from "~/server/modal-rpc/clients";
import { uploadJsonl } from "~/utils/azure/server";
import defineTask from "../defineTask";
import { trainOpenaiFineTune } from "./trainOpenaiFineTune";
import { CURRENT_PIPELINE_VERSION } from "~/types/shared.types";
import { serializeChatInput, serializeChatOutput } from "~/modelProviders/fine-tuned/serializers";
import { typedFineTune, typedNodeEntry } from "~/types/dbColumns.types";
import { truthyFilter } from "~/utils/utils";
import { getStringsToPrune, pruneInputMessages } from "~/utils/pruningRules";
import { insertTrainingDataPruningRuleMatches } from "~/server/utils/nodes/updatePruningRuleMatches";
import { trainingConfig } from "~/server/fineTuningProviders/openpipe/trainingConfig";
import { countLlamaInputTokens } from "~/utils/countTokens";

export type TrainFineTuneJob = {
  fineTuneId: string;
};

export const trainFineTune = defineTask<TrainFineTuneJob>({
  id: "trainFineTune",
  handler: async (task) => {
    const fineTune = await prisma.fineTune
      .findUnique({
        where: { id: task.fineTuneId },
      })
      .then((ft) => (ft ? typedFineTune(ft) : null));

    if (!fineTune) return;

    await insertTrainingDataPruningRuleMatches(fineTune.id);

    if (fineTune.provider === "openai") {
      await trainOpenaiFineTune(fineTune.id);
    } else {
      await trainModalFineTune(fineTune.id);
    }
  },
});

export async function* iterateTrainingRows(fineTuneId: string) {
  let offset = 0;
  while (true) {
    const rows = await kysely
      .selectFrom("FineTuneTrainingEntry as ftte")
      .where("ftte.fineTuneId", "=", fineTuneId)
      .innerJoin("DatasetEntryInput as dei", "dei.hash", "ftte.inputHash")
      .innerJoin("DatasetEntryOutput as deo", "deo.hash", "ftte.outputHash")
      .select([
        "ftte.id",
        "dei.messages",
        "dei.tool_choice",
        "dei.tools",
        "dei.inputTokens",
        "deo.output",
        "deo.outputTokens",
      ])
      .orderBy("ftte.id", "asc")
      .limit(1000)
      .offset(offset)
      .execute();
    if (rows.length === 0) break;

    offset += rows.length;
    yield* rows;
  }
}

const trainModalFineTune = async (fineTuneId: string) => {
  const fineTune = typedFineTune(
    await prisma.fineTune.findUniqueOrThrow({
      where: { id: fineTuneId },
      include: {
        dataset: {
          include: {
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
    }),
  );

  await prisma.fineTune.update({
    where: { id: fineTuneId },
    data: { status: "STARTED" },
  });

  const stringsToPrune = await getStringsToPrune(fineTune.id);

  const formattedRows = from(iterateTrainingRows(fineTune.id)).pipe(
    map(async (row) => {
      const tEntry = typedNodeEntry(row);
      if (!tEntry.output) return null;
      const prunedInputMessages = pruneInputMessages(tEntry.messages, stringsToPrune);
      const input = {
        messages: prunedInputMessages,
        tool_choice: tEntry.tool_choice ?? undefined,
        tools: tEntry.tools ?? undefined,
      };
      const prunedInputTokens = stringsToPrune?.length
        ? countLlamaInputTokens(input)
        : tEntry.inputTokens;
      await prisma.fineTuneTrainingEntry.update({
        where: { id: row.id },
        data: { prunedInputTokens, outputTokens: tEntry.outputTokens },
      });
      return {
        instruction: serializeChatInput(input, { pipelineVersion: CURRENT_PIPELINE_VERSION }),
        output: serializeChatOutput(tEntry.output),
      };
    }),
    filter(truthyFilter),
    map((row) => Buffer.from(JSON.stringify(row) + "\n")),
  );

  await prisma.fineTune.update({
    where: { id: fineTuneId },
    data: {
      status: "TRANSFERRING_TRAINING_DATA",
    },
  });

  const blobName = await uploadJsonl(toNodeStream(formattedRows));

  const huggingFaceModelId = `OpenPipe/ft-${env.NODE_ENV}-${fineTuneId}-${fineTune.slug}`;

  await prisma.fineTune.update({
    where: { id: fineTuneId },
    data: {
      status: "TRAINING",
      trainingBlobName: blobName,
      trainingStartedAt: new Date(),
      huggingFaceModelId,
      trainingConfig: await trainingConfig(fineTune),
    },
  });

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
    captureException(e, {
      extra: {
        text: "Failed to start training",
        fineTuneId,
        huggingFaceModelId,
      },
    });

    await prisma.fineTune.update({
      where: { id: fineTuneId },
      data: {
        status: "ERROR",
      },
    });
  }
};
