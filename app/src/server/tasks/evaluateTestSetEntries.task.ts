import type {
  DatasetEntry,
  DatasetEntryInput,
  DatasetEvalOutputSource,
  Prisma,
} from "@prisma/client";
import type { ChatCompletionCreateParams, FunctionParameters } from "openai/resources";
import { v4 as uuidv4 } from "uuid";
import { captureException } from "@sentry/node";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import type { JsonObject } from "type-fest";

import { kysely, prisma } from "~/server/db";
import { ORIGINAL_MODEL_ID, typedDatasetEntry } from "~/types/dbColumns.types";
import { getOpenaiCompletion } from "../utils/openai";
import defineTask from "./defineTask";
import { getComparisonModelName, isComparisonModel } from "~/utils/comparisonModels";
import { isEqual } from "lodash-es";
import { chatCompletionMessage } from "~/types/shared.types";
import { calculateQueryDelay } from "./generateTestSetEntry.task";
import { countOpenAIChatTokens } from "~/utils/countTokens";
import { generateEntry } from "./generateTestSetEntry.task";

export type EvalKey = {
  nodeEntryId: string;
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
    let { nodeEntryId, firstOutputSourceId, secondOutputSourceId, numPreviousTries = 0 } = task;

    // randomize the order of the output sources to avoid bias
    if (Math.random() > 0.5) {
      [firstOutputSourceId, secondOutputSourceId] = [secondOutputSourceId, firstOutputSourceId];
    }

    const nodeEntry = await prisma.nodeEntry.findUnique({
      where: { id: nodeEntryId },
    });

    const firstOutputSource = await prisma.datasetEvalOutputSource.findUnique({
      where: { id: firstOutputSourceId },
      include: {
        datasetEval: {
          include: {
            dataset: true,
          },
        },
      },
    });

    const secondOutputSource = await prisma.datasetEvalOutputSource.findUnique({
      where: { id: secondOutputSourceId },
    });

    if (!nodeEntry || !firstOutputSource || !secondOutputSource) return;

    const getOutput = async ({ outputSource }: { outputSource: DatasetEvalOutputSource }) => {
      if (outputSource.modelId !== ORIGINAL_MODEL_ID) {
        return kysely
          .selectFrom("NewFineTuneTestingEntry as ftte")
          .where("ftte.modelId", "=", outputSource.modelId)
          .where("ftte.inputHash", "=", nodeEntry.inputHash)
          .leftJoin("FineTune as ft", "ft.id", "ftte.fineTuneId")
          .innerJoin("DatasetEntryOutput as deo", "deo.hash", "ftte.outputHash")
          .select(["ftte.outputHash"])
          .executeTakeFirst()
          .then((entry) => entry?.outputHash);
      } else {
        return kysely
          .selectFrom("NodeEntry as ne")
          .where("ne.id", "=", nodeEntryId)
          .select(["ne.outputHash"])
          .executeTakeFirst()
          .then((entry) => entry?.outputHash);
      }
    };

    // Ensure output has already been generated
    const [existingFirstOutputHash, existingSecondOutputHash] = await Promise.all([
      getOutput({ outputSource: firstOutputSource }),
      getOutput({ outputSource: secondOutputSource }),
    ]);

    const generationPromises = [];

    if (!existingFirstOutputHash) {
      generationPromises.push(
        generateEntry({
          modelId: firstOutputSource.modelId,
          nodeEntryId,
        }),
      );
    }

    if (!existingSecondOutputHash) {
      generationPromises.push(
        generateEntry({
          modelId: secondOutputSource.modelId,
          nodeEntryId,
        }),
      );
    }

    await Promise.all(generationPromises);

    const [firstOutputHash, secondOutputHash] = await Promise.all([
      getOutput({ outputSource: firstOutputSource }),
      getOutput({ outputSource: secondOutputSource }),
    ]);

    if (!firstOutputHash || !secondOutputHash) return;

    const findCombinedResult = () =>
      kysely
        .selectFrom("NodeEntry as ne")
        .where("ne.id", "=", nodeEntryId)
        .innerJoin("DatasetEvalOutputSource as deos", (join) =>
          join.on("deos.id", "=", firstOutputSourceId),
        )
        .innerJoin("DatasetEvalOutputSource as comparisonDeos", (join) =>
          join.on("comparisonDeos.id", "=", secondOutputSourceId),
        )
        .innerJoin("NewDatasetEvalResult as der", (join) =>
          join
            .onRef("der.nodeEntryInputHash", "=", "ne.inputHash")
            .on("der.nodeEntryOutputHash", "=", firstOutputHash)
            .on("der.datasetEvalOutputSourceId", "=", firstOutputSourceId),
        )
        .innerJoin("NewDatasetEvalResult as comparisonDer", (join) =>
          join
            .onRef("comparisonDer.nodeEntryInputHash", "=", "ne.inputHash")
            .on("comparisonDer.nodeEntryOutputHash", "=", secondOutputHash)
            .on("comparisonDer.datasetEvalOutputSourceId", "=", secondOutputSourceId),
        );

    const exactMatchCombinedResult = await findCombinedResult()
      .innerJoin("DatasetEvalNodeEntry as dene", "dene.nodeEntryPersistentId", "ne.persistentId")
      .select([
        "der.id as firstResultId",
        "der.status as firstResultStatus",
        "comparisonDer.id as secondResultId",
        "comparisonDer.status as secondResultStatus",
      ])
      .executeTakeFirst();

    if (
      exactMatchCombinedResult?.firstResultStatus === "COMPLETE" &&
      exactMatchCombinedResult?.secondResultStatus === "COMPLETE"
    ) {
      return;
    }

    let firstResultId;
    let secondResultId;

    if (exactMatchCombinedResult) {
      firstResultId = exactMatchCombinedResult.firstResultId;
      secondResultId = exactMatchCombinedResult.secondResultId;
    } else {
      const datasetEvalNodeEntry = await prisma.datasetEvalNodeEntry.findFirst({
        where: {
          nodeEntryPersistentId: nodeEntry.persistentId,
          datasetEvalId: firstOutputSource.datasetEvalId,
        },
      });

      if (!datasetEvalNodeEntry) return;

      firstResultId = uuidv4();
      secondResultId = uuidv4();

      await kysely
        .insertInto("NewDatasetEvalResult")
        .values([
          {
            id: firstResultId,
            datasetEvalOutputSourceId: firstOutputSourceId,
            nodeEntryInputHash: nodeEntry.inputHash,
            nodeEntryOutputHash: firstOutputHash,
            datasetEvalNodeEntryId: datasetEvalNodeEntry.id,
            comparisonOutputSourceId: secondOutputSourceId,
            comparisonResultId: secondResultId,
            status: "PENDING",
            updatedAt: new Date(),
          },
          {
            id: secondResultId,
            datasetEvalOutputSourceId: secondOutputSourceId,
            nodeEntryInputHash: nodeEntry.inputHash,
            nodeEntryOutputHash: secondOutputHash,
            datasetEvalNodeEntryId: datasetEvalNodeEntry.id,
            comparisonOutputSourceId: firstOutputSourceId,
            comparisonResultId: firstResultId,
            status: "PENDING",
            updatedAt: new Date(),
          },
        ])
        .execute();
    }

    // delete all past results for this persistentId and these output sources
    await kysely
      .deleteFrom("NewDatasetEvalResult as der")
      .innerJoin("DatasetEvalNodeEntry as dene", "dene.id", "der.datasetEvalNodeEntryId")
      .where("dene.nodeEntryPersistentId", "=", nodeEntry.persistentId)
      .where("datasetEvalOutputSourceId", "=", firstOutputSourceId)
      .where("comparisonOutputSourceId", "=", secondOutputSourceId)
      .where("der.id", "!=", firstResultId)
      .execute();
    await kysely
      .deleteFrom("NewDatasetEvalResult as der")
      .innerJoin("DatasetEvalNodeEntry as dene", "dene.id", "der.datasetEvalNodeEntryId")
      .where("dene.nodeEntryPersistentId", "=", nodeEntry.persistentId)
      .where("datasetEvalOutputSourceId", "=", secondOutputSourceId)
      .where("comparisonOutputSourceId", "=", firstOutputSourceId)
      .where("der.id", "!=", secondResultId)
      .execute();

    const completeCombinedResult = await findCombinedResult()
      .where("der.status", "=", "COMPLETE")
      .where("comparisonDer.status", "=", "COMPLETE")
      .select([
        "der.score as firstResultScore",
        "der.explanation as firstResultExplanation",
        "der.judge",
        "der.wasFirst as firstResultWasFirst",
        "comparisonDer.score as secondResultScore",
        "comparisonDer.explanation as secondResultExplanation",
      ])
      .executeTakeFirst();

    if (completeCombinedResult) {
      await prisma.newDatasetEvalResult.update({
        where: { id: firstResultId },
        data: {
          score: completeCombinedResult.firstResultScore,
          explanation: completeCombinedResult.firstResultExplanation,
          judge: completeCombinedResult.judge,
          wasFirst: completeCombinedResult.firstResultWasFirst,
          status: "COMPLETE",
          errorMessage: null,
        },
      });
      await prisma.newDatasetEvalResult.update({
        where: { id: secondResultId },
        data: {
          score: completeCombinedResult.secondResultScore,
          explanation: completeCombinedResult.secondResultExplanation,
          judge: completeCombinedResult.judge,
          wasFirst: !completeCombinedResult.firstResultWasFirst,
          status: "COMPLETE",
          errorMessage: null,
        },
      });
      return;
    }

    const findResult = (criteria: Prisma.NewDatasetEvalResultWhereInput) =>
      prisma.newDatasetEvalResult.findFirst({
        where: criteria,
        include: {
          datasetEvalNodeEntry: {
            include: {
              datasetEval: {
                include: {
                  dataset: true,
                },
              },
            },
          },
          datasetEvalOutputSource: true,
        },
      });

    const [firstResult, secondResult] = await Promise.all([
      findResult({
        datasetEvalOutputSourceId: task.firstOutputSourceId,
        nodeEntryInputHash: nodeEntry.inputHash,
        nodeEntryOutputHash: firstOutputHash,
        comparisonOutputSourceId: task.secondOutputSourceId,
      }),
      findResult({
        datasetEvalOutputSourceId: task.secondOutputSourceId,
        nodeEntryInputHash: nodeEntry.inputHash,
        nodeEntryOutputHash: secondOutputHash,
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
      await prisma.newDatasetEvalResult.updateMany({
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

      const input = await prisma.datasetEntryInput.findUnique({
        where: { hash: nodeEntry.inputHash },
      });

      if (!input) {
        await prisma.newDatasetEvalResult.updateMany({
          where: {
            id: {
              in: [firstResult.id, secondResult.id],
            },
          },
          data: {
            status: "ERROR",
            errorMessage: "Error retrieving input for evaluation",
          },
        });
        return;
      }

      const outputs = [];
      const entryIds = [];

      for (const result of [firstResult, secondResult]) {
        try {
          if (result.datasetEvalOutputSource.modelId !== ORIGINAL_MODEL_ID) {
            const entry = await kysely
              .selectFrom("NewFineTuneTestingEntry as ftte")
              .where("ftte.modelId", "=", result.datasetEvalOutputSource.modelId)
              .where("ftte.inputHash", "=", nodeEntry.inputHash)
              .leftJoin("FineTune as ft", "ft.id", "ftte.fineTuneId")
              .innerJoin("DatasetEntryOutput as deo", "deo.hash", "ftte.outputHash")
              .select([
                "ftte.id",
                "ftte.modelId",
                "ft.slug as fineTuneSlug",
                "ftte.fineTuneId",
                "deo.output",
                "ftte.inputHash",
              ])
              .executeTakeFirstOrThrow();
            outputs.push(entry.output);
            if (isComparisonModel(entry.modelId)) {
              entryIds.push(getComparisonModelName(entry.modelId));
            } else if (entry.fineTuneSlug) {
              entryIds.push("openpipe:" + entry.fineTuneSlug);
            } else {
              throw new Error("No fineTune or comparison model found for entry");
            }
          } else {
            const entry = await kysely
              .selectFrom("NodeEntry as ne")
              .where("ne.id", "=", nodeEntryId)
              .innerJoin("DatasetEntryOutput as deo", "deo.hash", "ne.outputHash")
              .select(["deo.output"])
              .executeTakeFirstOrThrow();
            outputs.push(entry.output);
            entryIds.push("the original model");
          }
        } catch (e) {
          console.error("error getting entry for result", result, e);
          await prisma.newDatasetEvalResult.updateMany({
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

      const [firstOutput, secondOutput] = outputs;
      if (!firstOutput || !secondOutput) {
        // This job will be retried when the output is available
        await prisma.newDatasetEvalResult.updateMany({
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
        await prisma.newDatasetEvalResult.updateMany({
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

      if (outputsAreEqual(firstOutput, secondOutput)) {
        await prisma.newDatasetEvalResult.updateMany({
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

      const instructions = firstOutputSource.datasetEval.instructions;

      let args;

      let judgementInput: ChatCompletionCreateParams | null = null;

      try {
        judgementInput = constructJudgementInput(
          input,
          firstOutput as JsonObject,
          secondOutput as JsonObject,
          instructions,
        );

        const response = await getOpenaiCompletion(
          firstOutputSource.datasetEval.dataset.projectId,
          judgementInput,
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
        await prisma.newDatasetEvalResult.updateMany({
          where: {
            id: {
              in: [firstResult.id, secondResult.id],
            },
          },
          data: {
            status: "ERROR",
            errorMessage: "Error getting judgement",
            judge: judgementInput?.model,
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

      await prisma.newDatasetEvalResult.update({
        where: { id: firstResult.id },
        data: {
          status: "COMPLETE",
          explanation,
          score: score1,
          wasFirst: true,
          judge: judgementInput?.model,
        },
      });

      await prisma.newDatasetEvalResult.update({
        where: { id: secondResult.id },
        data: {
          status: "COMPLETE",
          explanation,
          score: score2,
          wasFirst: false,
          judge: judgementInput?.model,
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
        await prisma.newDatasetEvalResult.updateMany({
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
  datasetEntryInput: DatasetEntryInput,
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
        content: formatDatasetEntryInputInstructions(datasetEntryInput),
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

const formatDatasetEntryInputInstructions = (datasetEntryInput: DatasetEntryInput) => {
  const { messages, tool_choice, tools } = typedDatasetEntry(datasetEntryInput);
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
