import { type DatasetEntry, type Prisma } from "@prisma/client";

import { prisma } from "~/server/db";
import { typedDatasetEntry } from "~/types/dbColumns.types";
import { countLlamaInputTokens, countLlamaOutputTokens } from "~/utils/countTokens";
import { chatCompletionMessage } from "~/types/shared.types";
import { copyDatasetEvalDatasetEntries } from "~/server/utils/datasetEntryCreation/copyDatasetEvalDatasetEntries";
import { updatePruningRuleMatches } from "~/server/utils/updatePruningRuleMatches";
import { generateTestSetEntry } from "~/server/tasks/generateTestSetEntry.task";

export const copyEntryWithUpdates = async (
  prevEntryId: string,
  authoringUserId: string,
  provenance: DatasetEntry["provenance"],
  updates: {
    split?: "TRAIN" | "TEST";
    messages?: Prisma.JsonValue;
    tools?: Prisma.JsonValue;
    output?: Prisma.JsonValue;
  },
) => {
  const prevEntry = await prisma.datasetEntry.update({
    where: { id: prevEntryId },
    data: {
      outdated: true,
    },
    include: {
      matchedRules: {
        select: {
          pruningRuleId: true,
        },
      },
      dataset: {
        select: {
          enabledComparisonModels: true,
        },
      },
    },
  });

  const inputFields = typedDatasetEntry({
    messages: updates.messages ?? prevEntry.messages,
    tools: updates.tools ?? prevEntry.tools ?? undefined,
    tool_choice: prevEntry.tool_choice ?? undefined,
    functions: prevEntry.functions ?? undefined,
    function_call: prevEntry.function_call ?? undefined,
    response_format: prevEntry.response_format ?? undefined,
  });

  const validatedOutput = chatCompletionMessage.parse(updates.output ?? prevEntry.output);

  const newEntry = await prisma.datasetEntry.create({
    data: {
      ...inputFields,
      output: validatedOutput,
      inputTokens: countLlamaInputTokens(inputFields),
      outputTokens: countLlamaOutputTokens(validatedOutput),
      split: updates.split ?? prevEntry.split,
      datasetId: prevEntry.datasetId,
      sortKey: prevEntry.sortKey,
      provenance,
      authoringUserId,
      persistentId: prevEntry.persistentId,
      importId: prevEntry.importId,
      matchedRules: {
        create: prevEntry.matchedRules.map((match) => ({
          pruningRuleId: match.pruningRuleId,
        })),
      },
    },
  });

  await updatePruningRuleMatches(prevEntry.datasetId, new Date(0), [newEntry.id]);

  if (newEntry.split === "TEST") {
    await copyDatasetEvalDatasetEntries(prevEntry.id, newEntry.id);

    const fineTunes = await prisma.fineTune.findMany({
      where: {
        datasetId: newEntry.datasetId,
        status: "DEPLOYED",
      },
    });
    for (const fineTune of fineTunes) {
      await generateTestSetEntry.enqueue({
        modelId: fineTune.id,
        datasetEntryId: newEntry.id,
        numPreviousTries: 0,
      });
    }
    for (const comparisonModel of prevEntry.dataset.enabledComparisonModels) {
      await generateTestSetEntry.enqueue({
        modelId: comparisonModel,
        datasetEntryId: newEntry.id,
        numPreviousTries: 0,
      });
    }
  }
  return newEntry;
};
