import fs from "fs";
import OpenAI from "openai";
import { from } from "ix/asynciterable";
import { filter, map } from "ix/asynciterable/operators";

import { prisma } from "~/server/db";
import { truthyFilter } from "~/utils/utils";
import { convertToolCallMessagesToFunction } from "~/server/utils/convertFunctionCalls";
import { typedNodeEntry, typedFineTune } from "~/types/dbColumns.types";
import { chatCompletionMessage } from "~/types/shared.types";
import { countOpenAIChatTokens } from "~/utils/countTokens";
import { getStringsToPrune, pruneInputMessages } from "~/utils/pruningRules";
import { iterateTrainingRows } from "./trainFineTune.task";

export const trainOpenaiFineTune = async (fineTuneId: string) => {
  const fineTune = await prisma.fineTune
    .findUnique({
      where: { id: fineTuneId },
      include: {
        project: {
          select: {
            apiKeys: true,
          },
        },
      },
    })
    .then((ft) => (ft ? typedFineTune(ft) : null));
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

  const stringsToPrune = await getStringsToPrune(fineTune.id);

  const formattedRows = from(iterateTrainingRows(fineTune.id)).pipe(
    map(async (row) => {
      const outputMessage = chatCompletionMessage.parse(row.output);
      const prunedInputMessages = pruneInputMessages(typedNodeEntry(row).messages, stringsToPrune);
      const prunedInputTokens = countOpenAIChatTokens("gpt-3.5-turbo-0613", prunedInputMessages);
      const outputTokens = countOpenAIChatTokens("gpt-3.5-turbo-0613", [outputMessage]);
      await prisma.fineTuneTrainingEntry.update({
        where: { id: row.id },
        data: { prunedInputTokens, outputTokens },
      });
      return {
        messages: convertToolCallMessagesToFunction([...prunedInputMessages, outputMessage]),
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

  const openai = new OpenAI({ apiKey: openaiApiKey });

  // write jsonlStr to temp file using fs
  const tempDirPath = `/tmp/${fineTuneId}`;

  const trainingFilePath = `${tempDirPath}/training.jsonl`;
  // TODO: Include validation file

  fs.mkdirSync(tempDirPath, { recursive: true });

  const writeStream = fs.createWriteStream(trainingFilePath);

  for await (const row of formattedRows) {
    if (!writeStream.write(row)) {
      // Wait for the stream to drain if it returns false
      await new Promise((resolve) => writeStream.once("drain", resolve));
    }
  }

  // Close the write stream
  writeStream.end();

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
      model: fineTune.baseModel,
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
