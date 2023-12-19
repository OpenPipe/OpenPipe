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
import { getComparisonModelName, isComparisonModel } from "~/utils/comparisonModels";
import { isEqual, shuffle } from "lodash-es";
import { chatCompletionMessage } from "~/types/shared.types";
import { truthyFilter } from "~/utils/utils";
import { calculateQueryDelay } from "./generateTestSetEntry.task";
import { countOpenAIChatTokens } from "~/utils/countTokens";

type EvalKey = {
  datasetEvalDatasetEntryId: string;
  firstOutputSourceId: string;
  secondOutputSourceId: string;
};

// Accept result criteria instead of ids to recover from duplicate result creation attempts
export type EvaluateTestSetEntriesJob = EvalKey & {
  numPreviousTries?: number;
};

const MAX_TRIES = 50;

export const evaluateTestSetEntries = defineTask<EvaluateTestSetEntriesJob>({
  id: "evaluateTestSetEntries",
  handler: async (task) => {
    const { numPreviousTries = 0 } = task;

    const findResult = (criteria: Prisma.DatasetEvalResultWhereInput) =>
      prisma.datasetEvalResult.findFirst({
        where: criteria,
        include: {
          datasetEvalDatasetEntry: {
            include: {
              datasetEntry: { include: { dataset: true } },
              datasetEval: true,
            },
          },
          datasetEvalOutputSource: true,
        },
      });

    const [firstResult, secondResult] = await Promise.all([
      findResult({
        datasetEvalOutputSourceId: task.firstOutputSourceId,
        datasetEvalDatasetEntryId: task.datasetEvalDatasetEntryId,
        comparisonOutputSourceId: task.secondOutputSourceId,
      }),
      findResult({
        datasetEvalOutputSourceId: task.secondOutputSourceId,
        datasetEvalDatasetEntryId: task.datasetEvalDatasetEntryId,
        comparisonOutputSourceId: task.firstOutputSourceId,
      }),
    ]);

    if (
      !firstResult ||
      !secondResult ||
      (firstResult.status !== "PENDING" &&
        firstResult.status !== "ERROR" &&
        secondResult.status !== "PENDING" &&
        secondResult.status !== "ERROR")
    )
      return;

    try {
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
      if (!firstEntry?.output || !secondEntry?.output) {
        // This job will be retried when the output is available
        await prisma.datasetEvalResult.updateMany({
          where: {
            id: {
              in: [firstResult.id, secondResult.id],
            },
          },
          data: { status: "PENDING" },
        });
        return;
      }

      const [firstEntryId, secondEntryId] = entryIds;
      if (!firstEntryId || !secondEntryId) {
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

      if (outputsAreEqual(firstEntry.output, secondEntry.output)) {
        await prisma.datasetEvalResult.updateMany({
          where: {
            id: {
              in: [firstResult.id, secondResult.id],
            },
          },
          data: {
            status: "COMPLETE",
            explanation: "The outputs are identical.",
            score: 0.5,
          },
        });
        return;
      }

      let explanation;
      let judgement;

      const instructions = firstResult.datasetEvalDatasetEntry.datasetEval.instructions;

      let args;

      let input: ChatCompletionCreateParams | null = null;

      try {
        input = constructJudgementInput(
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
            judge: input?.model,
          },
        });
        throw e;
      }

      explanation = explanation
        .replaceAll("response 1", firstEntryId)
        .replaceAll("Response 1", firstEntryId)
        .replaceAll("response 2", secondEntryId)
        .replaceAll("Response 2", secondEntryId);

      let score1, score2;

      switch (judgement) {
        case "response 1":
          score1 = 1;
          score2 = 0;
          break;
        case "tie":
          score1 = 0.5;
          score2 = 0.5;
          break;
        case "response 2":
          score1 = 0;
          score2 = 1;
          break;
      }

      await prisma.datasetEvalResult.update({
        where: { id: firstResult.id },
        data: {
          status: "COMPLETE",
          explanation,
          score: score1,
          wasFirst: true,
          judge: input?.model,
        },
      });

      await prisma.datasetEvalResult.update({
        where: { id: secondResult.id },
        data: {
          status: "COMPLETE",
          explanation,
          score: score2,
          wasFirst: false,
          judge: input?.model,
        },
      });
    } catch (e) {
      console.error("error in evaluateTestSetEntries", e);
      if (numPreviousTries < MAX_TRIES) {
        await evaluateTestSetEntries.enqueue(
          {
            ...task,
            numPreviousTries: numPreviousTries + 1,
          },
          { runAt: new Date(Date.now() + calculateQueryDelay(numPreviousTries)), priority: 3 },
        );
      } else {
        await prisma.datasetEvalResult.updateMany({
          where: {
            id: {
              in: [firstResult.id, secondResult.id],
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
    .enum(["response 1", "response 2", "tie"])
    .describe("Which response is better in the context of the task?"),
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
    model: "gpt-4-0613",
    messages: [
      {
        role: "system",
        content:
          "You are an intelligent and fair judge of chatbots. Evaluate the following two responses and choose which one is better. If the outputs are of similar quality, you can mark them as EQUAL." +
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
        content: `This is response 1:\n\n${JSON.stringify(firstOutput)}`,
      },
      {
        role: "user",
        content: `This is response 2:\n\n${JSON.stringify(secondOutput)}`,
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

  const approximateTokens = countOpenAIChatTokens("gpt-4-0613", input.messages);

  if (approximateTokens > 7168) {
    input.model = "gpt-4-1106-preview";
  }

  return input;
};

const outputsAreEqual = (
  firstOutput: DatasetEntry["output"],
  secondOutput: DatasetEntry["output"],
) => {
  try {
    const typedFirstOutput = chatCompletionMessage.parse(firstOutput);
    const typedSecondOutput = chatCompletionMessage.parse(secondOutput);

    typedFirstOutput.tool_calls = typedFirstOutput.tool_calls?.map((call) => ({
      ...call,
      // Remove ids, which are not relevant to the comparison
      id: "",
      // Ignore differences in the serialization of arguments
      function: { ...call.function, arguments: JSON.parse(call.function.arguments) },
    }));
    typedSecondOutput.tool_calls = typedSecondOutput.tool_calls?.map((call) => ({
      ...call,
      id: "",
      function: { ...call.function, arguments: JSON.parse(call.function.arguments) },
    }));

    return isEqual(typedFirstOutput, typedSecondOutput);
  } catch {
    return false;
  }
};

const formatDatasetEntryInputInstructions = (datasetEntry: DatasetEntry) => {
  const { messages, tool_choice, tools } = typedDatasetEntry(datasetEntry);
  let instructions = "Here is the task that each chatbot was given:\n\nTASK START:\n";
  instructions += JSON.stringify(messages);
  if (tools?.length) {
    instructions += "\n\nThese are the tools that the models were given to use:\n";
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
    .innerJoin("DatasetEntry as de", "de.id", "dede.datasetEntryId")
    .where("de.outdated", "=", false)
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

  const evalsToRun: EvalKey[] = [];

  for (const datasetEval of evalForDatasetEntry) {
    const outputSource = datasetEval.outputSourcesWithOutput.find(
      (s) => s.modelId === testingEntry.modelId,
    );
    if (!outputSource) continue;
    for (const comparisonSource of datasetEval.outputSourcesWithOutput) {
      if (comparisonSource.modelId === testingEntry.modelId) continue;

      evalsToRun.push({
        datasetEvalDatasetEntryId: datasetEval.datasetEvalDatasetEntryId,
        firstOutputSourceId: outputSource.id,
        secondOutputSourceId: comparisonSource.id,
      });
    }
  }

  await queueAllHeadToHeadEvaluations(evalsToRun);
};

export const queueEvalJobsForEval = async (datasetEvalId: string) => {
  const datasetEvals = await kysely
    .selectFrom("DatasetEval as eval")
    .where("eval.id", "=", datasetEvalId)
    .select((eb) => [
      jsonArrayFrom(
        eb
          .selectFrom("DatasetEvalDatasetEntry as dede")
          .innerJoin("DatasetEntry", "DatasetEntry.id", "dede.datasetEntryId")
          .where("DatasetEntry.outdated", "=", false)
          .select(["dede.id", "dede.datasetEvalId"])
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

  const evalsToRun: EvalKey[] = [];

  for (const datasetEvalDatasetEntry of datasetEval.datasetEvalDatasetEntries) {
    for (let i = 0; i < datasetEval.outputSources.length; i++) {
      for (let j = i + 1; j < datasetEval.outputSources.length; j++) {
        evalsToRun.push({
          firstOutputSourceId: datasetEval.outputSources[i]?.id as string,
          secondOutputSourceId: datasetEval.outputSources[j]?.id as string,
          datasetEvalDatasetEntryId: datasetEvalDatasetEntry.id,
        });
      }
    }
  }

  await queueAllHeadToHeadEvaluations(evalsToRun);
};

async function queueAllHeadToHeadEvaluations(evalKeys: EvalKey[]) {
  const results = evalKeys
    .map((evalKey) => {
      const [firstOutputSourceId, secondOutputSourceId] = shuffle([
        evalKey.firstOutputSourceId,
        evalKey.secondOutputSourceId,
      ]);
      if (!firstOutputSourceId || !secondOutputSourceId) return null;

      return {
        firstResultId: uuidv4(),
        secondResultId: uuidv4(),
        evalKey,
      };
    })
    .filter(truthyFilter);

  await prisma.datasetEvalResult.createMany({
    data: results.flatMap((comparison) => [
      {
        id: comparison.firstResultId,
        datasetEvalOutputSourceId: comparison.evalKey.firstOutputSourceId,
        datasetEvalDatasetEntryId: comparison.evalKey.datasetEvalDatasetEntryId,
        comparisonResultId: comparison.secondResultId,
        comparisonOutputSourceId: comparison.evalKey.secondOutputSourceId,
      },
      {
        id: comparison.secondResultId,
        datasetEvalOutputSourceId: comparison.evalKey.secondOutputSourceId,
        datasetEvalDatasetEntryId: comparison.evalKey.datasetEvalDatasetEntryId,
        comparisonResultId: comparison.firstResultId,
        comparisonOutputSourceId: comparison.evalKey.firstOutputSourceId,
      },
    ]),
    skipDuplicates: true,
  });

  // Shuffle so all models get results run at roughly the same rate
  for (const result of shuffle(results)) {
    await evaluateTestSetEntries.enqueue(result.evalKey);
  }
}
