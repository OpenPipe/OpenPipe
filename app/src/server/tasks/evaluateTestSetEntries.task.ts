import type { DatasetEntry, FineTuneTestingEntry, Prisma } from "@prisma/client";
import type { ChatCompletionCreateParams, FunctionParameters } from "openai/resources";
import { v4 as uuidv4 } from "uuid";
import { jsonArrayFrom } from "kysely/helpers/postgres";
import { captureException } from "@sentry/node";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import type { JsonObject } from "type-fest";

import { kysely, prisma } from "~/server/db";
import { ORIGINAL_MODEL_ID, typedDatasetEntry } from "~/types/dbColumns.types";
import { getOpenaiCompletion } from "../utils/openai";
import defineTask from "./defineTask";
import { getComparisonModelName, isComparisonModel } from "~/utils/baseModels";
import { calculateQueryDelay } from "./queryModel.task";

export type EvaluateTestSetEntriesJob = {
  firstResultId: string;
  secondResultId: string;
  numPreviousTries: number;
};

const MAX_TRIES = 25;

const JUDGEMENT_OPTIONS = ["ALICE_BETTER", "EQUAL", "BOB_BETTER"] as const;

export const evaluateTestSetEntries = defineTask<EvaluateTestSetEntriesJob>({
  id: "evaluateTestSetEntries",
  handler: async (task) => {
    try {
      const { firstResultId, secondResultId } = task;

      const [firstResult, secondResult] = await prisma.datasetEvalResult.findMany({
        where: {
          id: {
            in: [firstResultId, secondResultId],
          },
        },
        include: {
          datasetEvalDatasetEntry: {
            include: {
              datasetEntry: {
                include: {
                  dataset: true,
                },
              },
              datasetEval: true,
            },
          },
          datasetEvalOutputSource: true,
        },
      });

      if (
        !firstResult ||
        !secondResult ||
        (firstResult.status !== "PENDING" &&
          firstResult.status !== "ERROR" &&
          secondResult.status !== "PENDING" &&
          secondResult.status !== "ERROR")
      )
        return;

      await prisma.datasetEvalResult.updateMany({
        where: {
          id: {
            in: [firstResult.id, secondResult.id],
          },
        },
        data: {
          status: "IN_PROGRESS",
          errorMessage: null,
        },
      });

      const entries = [];
      const entryIds = [];

      for (const result of [firstResult, secondResult]) {
        try {
          let entry;
          if (result.datasetEvalOutputSource.modelId !== ORIGINAL_MODEL_ID) {
            entry = await prisma.fineTuneTestingEntry.findUniqueOrThrow({
              where: {
                modelId_datasetEntryId: {
                  modelId: result.datasetEvalOutputSource.modelId,
                  datasetEntryId: result.datasetEvalDatasetEntry.datasetEntryId,
                },
              },
              include: {
                fineTune: true,
              },
            });
            if (isComparisonModel(entry.modelId)) {
              entryIds.push(getComparisonModelName(entry.modelId));
            } else if (entry.fineTune) {
              entryIds.push("openpipe:" + entry.fineTune.slug);
            } else {
              throw new Error("No fineTune or comparison model found for entry");
            }
          } else {
            entry = result.datasetEvalDatasetEntry.datasetEntry;
            entryIds.push("the original model");
          }
          entries.push(entry);
        } catch (e) {
          console.error("error getting entry for result", result, e);
          await prisma.datasetEvalResult.updateMany({
            where: {
              id: {
                in: [firstResult.id, secondResult.id],
              },
            },
            data: {
              status: "ERROR",
              errorMessage: "Error retrieving relevant input for evaluation",
            },
          });
          return;
        }
      }

      const [firstEntry, secondEntry] = entries;
      const [firstEntryId, secondEntryId] = entryIds;

      if (!firstEntry?.output || !secondEntry?.output || !firstEntryId || !secondEntryId) {
        await prisma.datasetEvalResult.updateMany({
          where: {
            id: {
              in: [firstResult.id, secondResult.id],
            },
          },
          data: {
            status: "ERROR",
            errorMessage: "Error preparing for evaluation",
          },
        });
        return;
      }

      let explanation;
      let judgement;

      const instructions = firstResult.datasetEvalDatasetEntry.datasetEval.instructions;

      let args;

      try {
        const input = constructJudgementInput(
          firstResult.datasetEvalDatasetEntry.datasetEntry,
          firstEntry.output as JsonObject,
          secondEntry.output as JsonObject,
          instructions,
        );

        const response = await getOpenaiCompletion(
          firstResult.datasetEvalDatasetEntry.datasetEntry.dataset.projectId,
          input,
        );

        args = response.choices[0]?.message?.tool_calls?.[0]?.function?.arguments;

        if (!args) throw new Error("No arguments returned" + JSON.stringify(response));

        const jsonArgs = JSON.parse(args);
        const parsedArgs = functionParamsSchema.parse(jsonArgs);

        explanation = parsedArgs.explanation;
        judgement = parsedArgs.judgement;
      } catch (e) {
        console.error("error getting judgement", args, e);
        captureException(e, { extra: { args } });
        await prisma.datasetEvalResult.updateMany({
          where: {
            id: {
              in: [firstResult.id, secondResult.id],
            },
          },
          data: {
            status: "ERROR",
            errorMessage: "Error getting judgement",
          },
        });
        throw e;
      }

      explanation = explanation.replaceAll("Alice", firstEntryId).replaceAll("Bob", secondEntryId);

      let score1, score2;

      switch (judgement) {
        case "ALICE_BETTER":
          score1 = 1;
          score2 = 0;
          break;
        case "EQUAL":
          score1 = 0.5;
          score2 = 0.5;
          break;
        case "BOB_BETTER":
          score1 = 0;
          score2 = 1;
          break;
      }

      await prisma.datasetEvalResult.update({
        where: {
          id: firstResult.id,
        },
        data: {
          status: "COMPLETE",
          explanation,
          score: score1,
        },
      });

      await prisma.datasetEvalResult.update({
        where: {
          id: secondResult.id,
        },
        data: {
          status: "COMPLETE",
          explanation,
          score: score2,
        },
      });
    } catch (e) {
      console.error("error in evaluateTestSetEntries", e);
      if (task.numPreviousTries < MAX_TRIES) {
        await evaluateTestSetEntries.enqueue(
          {
            ...task,
            numPreviousTries: task.numPreviousTries + 1,
          },
          { runAt: new Date(Date.now() + calculateQueryDelay(task.numPreviousTries)), priority: 3 },
        );
      } else {
        await prisma.datasetEvalResult.updateMany({
          where: {
            id: {
              in: [task.firstResultId, task.secondResultId],
            },
          },
          data: {
            status: "ERROR",
            errorMessage: "Unable to evaluate test set entries",
          },
        });
      }
      return;
    }
  },
  specDefaults: {
    priority: 5,
  },
});

const functionParamsSchema = z.object({
  explanation: z.string().describe("An explanation of why you chose the response you did"),
  judgement: z
    .enum(JUDGEMENT_OPTIONS)
    .describe("Whose response is better in the context of the task?"),
});

const functionParams = zodToJsonSchema(functionParamsSchema, "functionParamsSchema").definitions?.[
  "functionParamsSchema"
] as FunctionParameters;

const constructJudgementInput = (
  datasetEntry: DatasetEntry,
  firstOutput: JsonObject,
  secondOutput: JsonObject,
  instructions: string | null,
) => {
  const input: ChatCompletionCreateParams = {
    model: "gpt-4",
    messages: [
      {
        role: "system",
        content:
          "You are an intelligent and fair judge of chatbots. Evaluate the following two chatbot responses and choose which one is better. If the outputs are of similar quality, you can mark them as EQUAL." +
          (instructions
            ? `\n\n The user has provided the following instructions on what you should evaluate the outputs on: ${instructions}`
            : ""),
      },
      {
        role: "user",
        content: formatDatasetEntryInputInstructions(datasetEntry),
      },
      {
        role: "user",
        content: `This is what Alice said:\n\n${JSON.stringify(firstOutput)}`,
      },
      {
        role: "user",
        content: `This is what Bob said:\n\n${JSON.stringify(secondOutput)}`,
      },
    ],
    tools: [
      {
        type: "function",
        function: {
          name: "record_score",
          parameters: functionParams,
        },
      },
    ],
    tool_choice: { type: "function", function: { name: "record_score" } },
  };

  if (instructions) {
    input.messages.push({
      role: "user",
      content: `Remember to pay attention to the user's instructions: ${instructions}`,
    });
  }

  return input;
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

export const queueHeadToHeadEvalJobsForTestingEntry = async (
  testingEntry: FineTuneTestingEntry,
  datasetId: string,
) => {
  const evalForDatasetEntry = await kysely
    .selectFrom("DatasetEval as eval")
    .where("eval.datasetId", "=", datasetId)
    .where("eval.type", "=", "HEAD_TO_HEAD")
    .innerJoin("DatasetEvalDatasetEntry as dede", "dede.datasetEvalId", "eval.id")
    .where("dede.datasetEntryId", "=", testingEntry.datasetEntryId)
    .select((eb) => [
      "dede.id as datasetEvalDatasetEntryId",
      jsonArrayFrom(
        eb
          .selectFrom("DatasetEvalOutputSource as deos")
          .whereRef("deos.datasetEvalId", "=", "eval.id")
          .leftJoin("FineTuneTestingEntry as ftte", (join) =>
            join
              .onRef("ftte.modelId", "=", "deos.modelId")
              .onRef("ftte.datasetEntryId", "=", "dede.datasetEntryId"),
          )
          .where((eb) => {
            // Ensure output source already has output loaded
            return eb.or([
              eb("deos.modelId", "=", ORIGINAL_MODEL_ID),
              eb("ftte.output", "is not", null),
            ]);
          })
          .select(["deos.id", "deos.modelId", "ftte.output"]),
      ).as("outputSourcesWithOutput"),
    ])
    .execute();

  const datasetEvalResultsToCreate: Prisma.DatasetEvalResultCreateManyInput[] = [];
  const jobsToEnqueue: EvaluateTestSetEntriesJob[] = [];

  for (const datasetEval of evalForDatasetEntry) {
    const outputSource = datasetEval.outputSourcesWithOutput.find(
      (s) => s.modelId === testingEntry.modelId,
    );
    if (!outputSource) continue;
    for (const comparisonSource of datasetEval.outputSourcesWithOutput) {
      if (comparisonSource.modelId === testingEntry.modelId) continue;
      const firstResultId = uuidv4();
      const secondResultId = uuidv4();
      datasetEvalResultsToCreate.push({
        id: firstResultId,
        datasetEvalOutputSourceId: outputSource.id,
        datasetEvalDatasetEntryId: datasetEval.datasetEvalDatasetEntryId,
        comparisonResultId: secondResultId,
        comparisonOutputSourceId: comparisonSource.id,
      });
      datasetEvalResultsToCreate.push({
        id: secondResultId,
        datasetEvalOutputSourceId: comparisonSource.id,
        datasetEvalDatasetEntryId: datasetEval.datasetEvalDatasetEntryId,
        comparisonResultId: firstResultId,
        comparisonOutputSourceId: outputSource.id,
      });
      jobsToEnqueue.push({
        firstResultId,
        secondResultId,
        numPreviousTries: 0,
      });
    }
  }
  await prisma.datasetEvalResult.createMany({
    data: datasetEvalResultsToCreate,
    skipDuplicates: true,
  });

  for (const job of jobsToEnqueue) {
    await evaluateTestSetEntries.enqueue(job);
  }
};

export const queueEvalJobsForEval = async (datasetEvalId: string) => {
  console.log("queueEvalJobsForEval", datasetEvalId);
  const datasetEvals = await kysely
    .selectFrom("DatasetEval as eval")
    .where("eval.id", "=", datasetEvalId)
    .select((eb) => [
      jsonArrayFrom(
        eb
          .selectFrom("DatasetEvalDatasetEntry")
          .select(["id", "datasetEvalId"])
          .whereRef("datasetEvalId", "=", "eval.id"),
      ).as("datasetEvalDatasetEntries"),
      jsonArrayFrom(
        eb
          .selectFrom("DatasetEvalOutputSource")
          .select(["id", "modelId", "datasetEvalId"])
          .whereRef("datasetEvalId", "=", "eval.id"),
      ).as("outputSources"),
    ])
    .execute();

  const datasetEval = datasetEvals[0];
  if (!datasetEval) return;

  const datasetEvalResultsToCreate: Prisma.DatasetEvalResultCreateManyInput[] = [];
  const jobsToEnqueue: EvaluateTestSetEntriesJob[] = [];

  for (const datasetEvalDatasetEntry of datasetEval.datasetEvalDatasetEntries) {
    for (let i = 0; i < datasetEval.outputSources.length; i++) {
      for (let j = i + 1; j < datasetEval.outputSources.length; j++) {
        const firstOutputSource = datasetEval.outputSources[i];
        const secondOutputSource = datasetEval.outputSources[j];
        if (!firstOutputSource || !secondOutputSource) continue;
        const firstResultId = uuidv4();
        const secondResultId = uuidv4();

        datasetEvalResultsToCreate.push({
          id: firstResultId,
          datasetEvalOutputSourceId: firstOutputSource.id,
          datasetEvalDatasetEntryId: datasetEvalDatasetEntry.id,
          comparisonResultId: secondResultId,
          comparisonOutputSourceId: secondOutputSource.id,
        });
        datasetEvalResultsToCreate.push({
          id: secondResultId,
          datasetEvalOutputSourceId: secondOutputSource.id,
          datasetEvalDatasetEntryId: datasetEvalDatasetEntry.id,
          comparisonResultId: firstResultId,
          comparisonOutputSourceId: firstOutputSource.id,
        });
        jobsToEnqueue.push({
          firstResultId,
          secondResultId,
          numPreviousTries: 0,
        });
      }
    }
  }

  await prisma.datasetEvalResult.createMany({
    data: datasetEvalResultsToCreate,
    skipDuplicates: true,
  });

  for (const job of jobsToEnqueue) {
    await evaluateTestSetEntries.enqueue(job);
  }
};
