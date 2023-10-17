import { getStringsToPrune, pruneInputMessages } from "~/modelProviders/fine-tuned/getCompletion";
import { prisma } from "../db";
import { countLlamaChatTokens, countOpenAIChatTokens } from "~/utils/countTokens";
import { evaluateTestSetEntry } from "../tasks/evaluateTestSetEntry.task";
import { z } from "zod";
import { chatMessage } from "~/types/shared.types";
import { BaseModel, ComparisonModel } from "@prisma/client";

export const startDatasetTestJobs = async (datasetId: string) => {
  const dataset = await prisma.dataset.findUnique({
    where: { id: datasetId },
    include: {
      fineTunes: true,
    },
  });
  if (!dataset) return;
  for (const fineTune of dataset.fineTunes) {
    await startTestJobs(datasetId, fineTune.id);
  }
  for (const comparisonModel of dataset.enabledComparisonModels) {
    await startTestJobs(datasetId, comparisonModel);
  }
};

export const startTestJobs = async (datasetId: string, modelId: string) => {
  const stringsToPrune = await getStringsToPrune(modelId);
  const [datasetEntries, fineTune] = await prisma.$transaction([
    prisma.datasetEntry.findMany({
      where: { datasetId, outdated: false, type: "TEST" },
      select: { id: true, messages: true },
      orderBy: { sortKey: "desc" },
    }),
    prisma.fineTune.findUnique({
      where: { id: modelId },
      select: { baseModel: true },
    }),
  ]);
  const baseModel = fineTune?.baseModel;
  // create fineTuneTestEntry for each dataset entry
  await prisma.fineTuneTestingEntry.createMany({
    data: datasetEntries.map((entry) => {
      const prunedInput = pruneInputMessages(
        z.array(chatMessage).parse(entry.messages),
        stringsToPrune,
      );
      let prunedInputTokens;
      if (baseModel === BaseModel.GPT_3_5_TURBO || modelId === ComparisonModel.GPT_3_5_TURBO) {
        prunedInputTokens = countOpenAIChatTokens("gpt-3.5-turbo-0613", prunedInput);
      } else {
        prunedInputTokens = countLlamaChatTokens(JSON.stringify(prunedInput));
      }
      return {
        modelId,
        datasetEntryId: entry.id,
        prunedInputTokens,
        prunedInput: JSON.stringify(prunedInput),
      };
    }),
    skipDuplicates: true,
  });
  for (const entry of datasetEntries) {
    await evaluateTestSetEntry.enqueue({ modelId, datasetEntryId: entry.id });
  }
};
