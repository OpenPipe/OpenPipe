import { type FineTune } from "@prisma/client";
import { type ChatCompletionMessage } from "openai/resources/chat";

import { getStringsToPrune, pruneInputMessages } from "~/modelProviders/fine-tuned/getCompletion";
import { prisma } from "../db";
import { countLlamaChatTokens, countOpenAIChatTokens } from "~/utils/countTokens";
import { getTestResult } from "../tasks/getTestResult.task";

export const startTestJobs = async (fineTune: FineTune) => {
  const stringsToPrune = await getStringsToPrune(fineTune.id);
  const datasetEntries = await prisma.datasetEntry.findMany({
    where: { datasetId: fineTune.datasetId, outdated: false, type: "TEST" },
    select: { id: true, messages: true },
    orderBy: { sortKey: "desc" },
  });
  // create fineTuneTestEntry for each dataset entry
  await prisma.fineTuneTestingEntry.createMany({
    data: datasetEntries.map((entry) => {
      const prunedInput = pruneInputMessages(
        entry.messages as unknown as ChatCompletionMessage[],
        stringsToPrune,
      );
      let prunedInputTokens;
      if (fineTune.baseModel === "GPT_3_5_TURBO") {
        prunedInputTokens = countOpenAIChatTokens("gpt-3.5-turbo-0613", prunedInput);
      } else {
        prunedInputTokens = countLlamaChatTokens(JSON.stringify(prunedInput));
      }
      return {
        fineTuneId: fineTune.id,
        datasetEntryId: entry.id,
        prunedInputTokens,
        prunedInput: JSON.stringify(prunedInput),
      };
    }),
    skipDuplicates: true,
  });
  for (const entry of datasetEntries) {
    await getTestResult.enqueue({ fineTuneId: fineTune.id, datasetEntryId: entry.id });
  }
};
