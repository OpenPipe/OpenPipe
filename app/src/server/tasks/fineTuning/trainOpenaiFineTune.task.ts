import OpenAI from "openai";
import fs from "fs";

import { prisma } from "~/server/db";
import defineTask from "../defineTask";
import {
  type ContentChatCompletionMessage,
  type OpenaiTrainingRow,
} from "~/components/datasets/validateTrainingRows";
import { getStringsToPrune, pruneInputMessages } from "~/modelProviders/fine-tuned/getCompletion";

export type TrainOpenaiFineTuneJob = {
  fineTuneId: string;
};

export const trainOpenaiFineTune = defineTask<TrainOpenaiFineTuneJob>(
  "trainOpenaiFineTune",
  async (task) => {
    const { fineTuneId } = task;
    const fineTune = await prisma.fineTune.findUnique({
      where: { id: fineTuneId },
      include: {
        trainingEntries: {
          select: {
            datasetEntry: {
              select: {
                input: true,
                output: true,
              },
            },
          },
        },
        project: {
          select: {
            apiKeys: true,
          },
        },
      },
    });
    if (!fineTune) return;

    const openaiApiKey = fineTune.project.apiKeys.find((key) => key.provider === "OPENAI")?.apiKey;

    if (!openaiApiKey) {
      await prisma.fineTune.update({
        where: { id: fineTuneId },
        data: {
          status: "ERROR",
          errorMessage: "No OpenAI API key found",
        },
      });
      return;
    }

    await prisma.fineTune.update({
      where: { id: fineTuneId },
      data: {
        status: "TRANSFERRING_TRAINING_DATA",
      },
    });

    const stringsToPrune = await getStringsToPrune(fineTune.id);

    const trainingEntries = fineTune.trainingEntries.map((entry) => ({
      messages: [
        ...pruneInputMessages(
          entry.datasetEntry.input as unknown as ContentChatCompletionMessage[],
          stringsToPrune,
        ),
        entry.datasetEntry.output,
      ],
    })) as unknown as OpenaiTrainingRow[];

    const jsonlStr = trainingEntries.map((row) => JSON.stringify(row)).join("\n");

    const openai = new OpenAI({ apiKey: openaiApiKey });

    // write jsonlStr to temp file using fs
    const tempDirPath = `/tmp/${fineTuneId}`;

    const trainingFilePath = `${tempDirPath}/training.jsonl`;
    // TODO: Include validation file

    fs.mkdirSync(tempDirPath, { recursive: true });
    fs.writeFileSync(trainingFilePath, jsonlStr);

    try {
      const trainingFile = await openai.files.create({
        file: fs.createReadStream(trainingFilePath),
        purpose: "fine-tune",
      });

      console.log("uploaded training file", trainingFile);

      await prisma.fineTune.update({
        where: { id: fineTuneId },
        data: {
          status: "TRAINING",
          trainingStartedAt: new Date(),
        },
      });

      const fineTuneJob = await openai.fineTuning.jobs.create({
        training_file: trainingFile.id,
        model: "gpt-3.5-turbo",
      });

      await prisma.fineTune.update({
        where: { id: fineTuneId },
        data: {
          openaiTrainingJobId: fineTuneJob.id,
        },
      });
    } catch (e) {
      console.error("Failed to start openai training", e);
      await prisma.fineTune.update({
        where: { id: fineTuneId },
        data: {
          status: "ERROR",
          errorMessage: (e as Error).message,
        },
      });
    } finally {
      fs.unlinkSync(trainingFilePath);
    }
  },
);
