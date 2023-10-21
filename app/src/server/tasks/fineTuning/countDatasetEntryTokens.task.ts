import { prisma } from "~/server/db";
import { typedDatasetEntry } from "~/types/dbColumns.types";
import { countLlamaInputTokens, countLlamaOutputTokens } from "~/utils/countTokens";
import defineTask from "../defineTask";

export const countDatasetEntryTokens = defineTask<void>({
  id: "countDatasetEntryTokens",
  handler: async () => {
    while (true) {
      const batch = await prisma.datasetEntry.findMany({
        select: {
          id: true,
          messages: true,
          function_call: true,
          functions: true,
          output: true,
        },
        orderBy: { sortKey: "desc" },
        where: { inputTokens: 0 },
        take: 1000,
      });

      if (batch.length === 0) break;

      await Promise.all(
        batch.map(async (datasetEntry) => {
          const entry = typedDatasetEntry(datasetEntry);
          const inputTokens = countLlamaInputTokens(entry);
          const outputTokens = entry.output ? countLlamaOutputTokens(entry.output) : 0;

          if (inputTokens === 0) {
            throw new Error(`Invalid token count on dataset entry ${datasetEntry.id}`);
          }

          await prisma.datasetEntry.update({
            where: { id: datasetEntry.id },
            data: { inputTokens, outputTokens },
          });
        }),
      );
    }
  },
  specDefaults: {
    // Ensure only one of these tasks runs at a time
    jobKey: "countDatasetEntryTokens",
  },
});
