import type { DatasetEntry, DatasetEval, FineTuneTestingEntry } from "@prisma/client";
import type { ChatCompletionCreateParams } from "openai/resources";

import { prisma } from "~/server/db";
import { typedDatasetEntry } from "~/types/dbColumns.types";
import { getOpenaiCompletion } from "../utils/openai";
import defineTask from "./defineTask";

type OutputSource = {
  datasetEntryId: string;
  // if fineTuneTestingEntryId is not set, use the dataset entry's original output
  fineTuneTestingEntryId?: string;
};

export type EvaluateTestSetEntriesJob = {
  datasetEvalId: string;
  firstOutputSource: OutputSource;
  secondOutputSource: OutputSource;
};

const JUDGEMENT_OPTIONS = ["ALICE_BETTER", "EQUAL", "BOB_BETTER"] as const;

export const evaluateTestSetEntries = defineTask<EvaluateTestSetEntriesJob>({
  id: "evaluateTestSetEntries",
  handler: async (task) => {
    const {
      datasetEvalId,
      firstOutputSource: originalFirstOutputSource,
      secondOutputSource: originalSecondOutputSource,
    } = task;

    // randomize the order of the output sources so that the order doesn't affect the overall results
    let firstOutputSource, secondOutputSource;
    if (Math.random() > 0.5) {
      firstOutputSource = originalFirstOutputSource;
      secondOutputSource = originalSecondOutputSource;
    } else {
      firstOutputSource = originalSecondOutputSource;
      secondOutputSource = originalFirstOutputSource;
    }

    const evalRunId = createEvalRunId(datasetEvalId, [firstOutputSource, secondOutputSource]);

    const [datasetEval, datasetEntry, existingScores] = await prisma.$transaction([
      prisma.datasetEval.findUnique({
        where: { id: datasetEvalId },
        include: {
          dataset: {
            include: {
              project: true,
            },
          },
        },
      }),
      prisma.datasetEntry.findUnique({
        where: { id: firstOutputSource.datasetEntryId },
      }),
      prisma.datasetEvalScore.findMany({
        where: { evalRunId },
      }),
    ]);

    if (existingScores.length >= 2) return;

    const entries = [];
    const entryIds = [];

    for (const outputSource of [firstOutputSource, secondOutputSource]) {
      try {
        let entry;
        if (outputSource.fineTuneTestingEntryId) {
          entry = await prisma.fineTuneTestingEntry.findUniqueOrThrow({
            where: {
              id: outputSource.fineTuneTestingEntryId,
            },
            include: {
              fineTune: true,
            },
          });
          if (!entry.fineTune) throw new Error("No fineTune found for entry");
          entryIds.push("openpipe:" + entry.fineTune.slug);
        } else {
          entry = await prisma.datasetEntry.findUniqueOrThrow({
            where: {
              id: firstOutputSource.datasetEntryId,
            },
          });
          entryIds.push("the original model");
        }
        entries.push(entry);
      } catch (e) {
        console.error("error getting entry for outputSource", outputSource, e);
        return;
      }
    }

    const [firstEntry, secondEntry] = entries;
    const [firstEntryId, secondEntryId] = entryIds;

    if (
      !datasetEval?.dataset ||
      !datasetEntry ||
      !firstEntry?.output ||
      !secondEntry?.output ||
      !firstEntryId ||
      !secondEntryId
    )
      return;

    let explanation;
    let judgement;

    try {
      const input: ChatCompletionCreateParams = {
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: `You are an intelligent and fair judge of chatbots. Evaluate the following two chatbot responses and choose which one is better in the following way: ${
              datasetEval.instructions ?? ""
            }`,
          },
          {
            role: "user",
            content: formatDatasetEntryInputInstructions(datasetEntry),
          },
          {
            role: "user",
            content: `This is what Alice said:\n\n${JSON.stringify(firstEntry.output)}`,
          },
          {
            role: "user",
            content: `This is what Bob said:\n\n${JSON.stringify(secondEntry.output)}`,
          },
          {
            role: "user",
            content: `Which response is better in the context of the task? Remember to pay attention to the following: ${
              datasetEval.instructions ?? ""
            }`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "record_score",
              parameters: {
                type: "object",
                properties: {
                  explanation: {
                    type: "string",
                    description: "An explanation of why you chose the response you did",
                  },
                  judgement: {
                    type: "string",
                    enum: JUDGEMENT_OPTIONS,
                    description: "Whose response is better in the context of the task?",
                  },
                },
                required: ["explanation", "judgement"],
              },
            },
          },
        ],
      };

      const response = await getOpenaiCompletion(datasetEval.dataset.projectId, input);

      const args = response.choices[0]?.message?.tool_calls?.[0]?.function?.arguments;

      if (!args) throw new Error("No arguments returned" + JSON.stringify(response));

      const parsedArgs = JSON.parse(args);

      if (!parsedArgs["explanation"] || !parsedArgs["judgement"]) {
        throw new Error("No explanation or judgement returned" + JSON.stringify(response));
      }

      explanation = parsedArgs["explanation"] as string;
      judgement = parsedArgs["judgement"] as (typeof JUDGEMENT_OPTIONS)[number];

      if (!JUDGEMENT_OPTIONS.includes(judgement)) {
        throw new Error("Invalid judgement returned" + JSON.stringify(response));
      }
    } catch (e) {
      console.error("error getting judgement", e);
      throw e;
    }

    explanation = explanation.replaceAll("Alice", firstEntryId).replaceAll("Bob", secondEntryId);

    let score1, score2;

    switch (judgement) {
      case "ALICE_BETTER":
        score1 = 1;
        score2 = -1;
        break;
      case "EQUAL":
        score1 = 0;
        score2 = 0;
        break;
      case "BOB_BETTER":
        score1 = -1;
        score2 = 1;
        break;
    }

    // Wipe out any existing scores for this eval run id
    await prisma.datasetEvalScore.deleteMany({
      where: { evalRunId },
    });

    await prisma.datasetEvalScore.create({
      data: {
        datasetEvalId,
        datasetEntryId: firstOutputSource.datasetEntryId,
        fineTuneTestingEntryId: firstOutputSource.fineTuneTestingEntryId,
        explanation,
        score: score1,
      },
    });

    await prisma.datasetEvalScore.create({
      data: {
        datasetEvalId,
        datasetEntryId: secondOutputSource.datasetEntryId,
        fineTuneTestingEntryId: secondOutputSource.fineTuneTestingEntryId,
        explanation,
        score: score2,
      },
    });
  },
  specDefaults: {
    priority: 5,
  },
});

export const queueEvalJobsForTestingEntry = async (
  testingEntry: FineTuneTestingEntry,
  datasetId: string,
) => {
  const evals = await prisma.datasetEval.findMany({
    where: {
      datasetId: datasetId,
    },
  });
  const allTestingEntries = await prisma.fineTuneTestingEntry.findMany({
    where: {
      datasetEntryId: testingEntry.datasetEntryId,
    },
  });
  const source = {
    datasetEntryId: testingEntry.datasetEntryId,
    fineTuneTestingEntryId: testingEntry.id,
  };
  const comparisonSources = [
    { datasetEntryId: testingEntry.datasetEntryId },
    ...allTestingEntries
      .filter((entry) => entry.id != testingEntry.id)
      .map((entry) => ({
        datasetEntryId: testingEntry.datasetEntryId,
        fineTuneTestingEntryId: entry.id,
      })),
  ];

  for (const e of evals) {
    for (const secondSource of comparisonSources) {
      await evaluateTestSetEntries.enqueue({
        datasetEvalId: e.id,
        firstOutputSource: source,
        secondOutputSource: secondSource,
      });
    }
  }
};

export const queueEvalJobsForEval = async (datasetEval: DatasetEval) => {
  const datasetEntries = await prisma.datasetEntry.findMany({
    where: {
      datasetId: datasetEval.datasetId,
      split: "TEST",
      outdated: false,
    },
    include: {
      fineTuneTestDatasetEntries: true,
    },
  });

  for (const entry of datasetEntries) {
    const sources = [
      { datasetEntryId: entry.id },
      ...entry.fineTuneTestDatasetEntries.map((entry) => ({
        datasetEntryId: entry.datasetEntryId,
        fineTuneTestingEntryId: entry.id,
      })),
    ];
    for (let i = 0; i < sources.length; i++) {
      for (let j = i + 1; j < sources.length; j++) {
        await evaluateTestSetEntries.enqueue({
          datasetEvalId: datasetEval.id,
          firstOutputSource: sources[i] as OutputSource,
          secondOutputSource: sources[j] as OutputSource,
        });
      }
    }
  }
};

// Ensure that the eval run id is unique and deterministic for each datasetEvalId and set of output sources
const createEvalRunId = (datasetEvalId: string, sources: OutputSource[]) => {
  const sortedSourceIds = sources
    .map((source) => source.fineTuneTestingEntryId ?? source.datasetEntryId)
    .sort();
  return datasetEvalId + ":" + sortedSourceIds.join("_");
};

const formatDatasetEntryInputInstructions = (datasetEntry: DatasetEntry) => {
  const { messages, tool_choice, tools } = typedDatasetEntry(datasetEntry);
  let instructions = "Here is the task that each chatbot was given:\n\nTASK START:\n";
  instructions += JSON.stringify(messages);
  if (tools?.length) {
    instructions += "\n\nThese are the tools that Alice and Bob were given to use:\n";
    instructions += JSON.stringify(tools);
  }
  if (tool_choice) {
    instructions += "\n\nThey were told to use this tool in particular:\n";
    instructions += JSON.stringify(tool_choice);
  }
  return instructions + "\nTASK END\n";
};
