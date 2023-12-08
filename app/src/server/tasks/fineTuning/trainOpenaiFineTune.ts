import fs from "fs";
import OpenAI from "openai";

import { prisma } from "~/server/db";
import { convertToolCallMessagesToFunction } from "~/server/utils/convertFunctionCalls";
import { typedDatasetEntry } from "~/types/dbColumns.types";
import { chatCompletionMessage } from "~/types/shared.types";
import { getStringsToPrune, pruneInputMessages } from "~/utils/pruningRules";

export const trainOpenaiFineTune = async (fineTuneId: string) => {
  const fineTune = await prisma.fineTune.findUnique({
    where: { id: fineTuneId },
    include: {
      trainingEntries: {
        select: {
          datasetEntry: {
            select: {
              messages: true,
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

  // TODO: this will break for large datasets. Switch to the iterateTrainingRows
  // approach we use in trainFineTune.
  const trainingEntries = fineTune.trainingEntries.map((entry) => {
    const outputMessage = chatCompletionMessage.parse(entry.datasetEntry.output);
    return {
      messages: convertToolCallMessagesToFunction([
        ...pruneInputMessages(typedDatasetEntry(entry.datasetEntry).messages, stringsToPrune),
        outputMessage,
      ]),
    };
  });

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
      model: "gpt-3.5-turbo-1106",
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
};
