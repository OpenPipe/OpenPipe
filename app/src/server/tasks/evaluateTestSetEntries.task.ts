import type {
  DatasetEntryInput,
  NodeEntry,
  ComparisonModel,
  DatasetEntryOutput,
} from "@prisma/client";
import type { ChatCompletionCreateParams, FunctionParameters } from "openai/resources";
import { captureException } from "@sentry/node";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import type { JsonObject } from "type-fest";
import { isEqual } from "lodash-es";
import { RateLimitError } from "openai";

import { kysely, prisma } from "~/server/db";
import { ORIGINAL_MODEL_ID } from "~/types/dbColumns.types";
import { getOpenaiCompletion } from "../utils/openai";
import defineTask from "./defineTask";
import { getComparisonModelName, isComparisonModel } from "~/utils/comparisonModels";
import { chatCompletionMessage } from "~/types/shared.types";
import { countOpenAIChatTokens } from "~/utils/countTokens";
import { generateEntry } from "./generateTestSetEntry.task";
import { typedDatasetEntryInput } from "~/types/dbColumns.types";

export const RESPONSE_1_PLACEHOLDER = "Response 1";
export const RESPONSE_2_PLACEHOLDER = "Response 2";

export const getModelTitle = ({
  modelId,
  slug,
}: {
  modelId: string | null;
  slug: string | null;
}): string => {
  if (modelId === ORIGINAL_MODEL_ID) {
    return "the original model";
  }
  if (modelId && isComparisonModel(modelId)) {
    return getComparisonModelName(modelId as ComparisonModel) as string;
  }
  if (slug) {
    return `openpipe:${slug}`;
  }
  throw new Error("Model title not found");
};

// Accept result criteria instead of ids to recover from duplicate result creation attempts
export type EvalKey = {
  nodeEntryId: string;
  firstOutputSourceId: string;
  secondOutputSourceId: string;
};

export const evaluateTestSetEntries = defineTask<EvalKey>({
  id: "evaluateTestSetEntries",
  handler: async (task) => {
    let { nodeEntryId, firstOutputSourceId, secondOutputSourceId } = task;

    // randomize the order of the output sources to avoid bias
    if (Math.random() > 0.5) {
      [firstOutputSourceId, secondOutputSourceId] = [secondOutputSourceId, firstOutputSourceId];
    }

    const [nodeEntry, firstOutputSource, secondOutputSource] = await prisma.$transaction([
      prisma.nodeEntry.findUnique({ where: { id: nodeEntryId } }),
      prisma.datasetEvalOutputSource.findUnique({ where: { id: firstOutputSourceId } }),
      prisma.datasetEvalOutputSource.findUnique({ where: { id: secondOutputSourceId } }),
    ]);

    if (!nodeEntry || !firstOutputSource || !secondOutputSource) return;

    let firstOutputHash, secondOutputHash;
    try {
      // generate the outputs if they don't exist
      [firstOutputHash, secondOutputHash] = await getOutputHashes({
        nodeEntry,
        modelId1: firstOutputSource.modelId,
        modelId2: secondOutputSource.modelId,
      });

      if (!firstOutputHash || !secondOutputHash) return;
    } catch (e) {
      // only retry if the error is a rate limit error
      if (e instanceof RateLimitError) throw e;
      return;
    }

    const findResult = async ({
      outputSourceId,
      comparisonOutputSourceId,
    }: {
      outputSourceId: string;
      comparisonOutputSourceId: string;
    }) =>
      kysely
        .selectFrom("NodeEntry as ne")
        .innerJoin("DatasetEvalNodeEntry as dene", "dene.nodeEntryPersistentId", "ne.persistentId")
        .innerJoin("DatasetEvalResult as der", (join) =>
          join
            .onRef("der.nodeEntryInputHash", "=", "ne.inputHash")
            .on("der.datasetEvalOutputSourceId", "=", outputSourceId)
            .on("der.comparisonOutputSourceId", "=", comparisonOutputSourceId)
            .onRef("der.datasetEvalNodeEntryId", "=", "dene.id"),
        )
        .innerJoin("DatasetEvalOutputSource as deos", (join) =>
          join.on("deos.id", "=", outputSourceId),
        )
        .selectAll("der")
        .select(["deos.modelId"])
        .where("ne.id", "=", nodeEntryId)
        .executeTakeFirst();

    const [firstResult, secondResult] = await Promise.all([
      findResult({
        outputSourceId: firstOutputSourceId,
        comparisonOutputSourceId: secondOutputSourceId,
      }),
      findResult({
        outputSourceId: secondOutputSourceId,
        comparisonOutputSourceId: firstOutputSourceId,
      }),
    ]);

    if (!firstResult || !secondResult) return;

    const firstResultHandled =
      (firstResult.status === "IN_PROGRESS" || firstResult.status === "COMPLETE") &&
      // backfill results if they were created without a score (3/9/2024 bugfix)
      firstResult.score !== null &&
      (firstResult.nodeEntryOutputHash === nodeEntry.outputHash ||
        firstResult.modelId !== ORIGINAL_MODEL_ID);

    const secondResultHandled =
      (secondResult.status === "IN_PROGRESS" || secondResult.status === "COMPLETE") &&
      secondResult.score !== null &&
      (secondResult.nodeEntryOutputHash === nodeEntry.outputHash ||
        secondResult.modelId !== ORIGINAL_MODEL_ID);

    if (firstResultHandled && secondResultHandled) return;

    await prisma.datasetEvalResult.updateMany({
      where: {
        id: {
          in: [firstResult.id, secondResult.id],
        },
      },
      data: {
        status: "IN_PROGRESS",
        nodeEntryOutputHash: nodeEntry.outputHash,
        errorMessage: null,
      },
    });

    // Look for cached combined result from another row
    const completeCombinedResult = await kysely
      .selectFrom("NodeEntry as ne")
      .where("ne.id", "=", nodeEntryId)
      .innerJoin("DatasetEvalOutputSource as deos", (join) =>
        join.on("deos.id", "=", firstOutputSourceId),
      )
      .innerJoin("DatasetEvalOutputSource as comparisonDeos", (join) =>
        join.on("comparisonDeos.id", "=", secondOutputSourceId),
      )
      .innerJoin("DatasetEvalResult as der", (join) =>
        join
          .onRef("der.nodeEntryInputHash", "=", "ne.inputHash")
          .on("der.datasetEvalOutputSourceId", "=", firstOutputSourceId)
          .on("der.status", "=", "COMPLETE")
          .on("der.score", "!=", null),
      )
      .innerJoin("DatasetEvalResult as comparisonDer", (join) =>
        join
          .onRef("comparisonDer.nodeEntryInputHash", "=", "ne.inputHash")
          .on("comparisonDer.datasetEvalOutputSourceId", "=", secondOutputSourceId)
          .on("comparisonDer.status", "=", "COMPLETE")
          .on("comparisonDer.score", "!=", null),
      )
      .innerJoin("DatasetEvalNodeEntry as dene", "dene.nodeEntryPersistentId", "ne.persistentId")
      .where((eb) =>
        eb.or([
          eb("deos.modelId", "!=", ORIGINAL_MODEL_ID),
          eb("der.nodeEntryOutputHash", "=", "ne.outputHash"),
        ]),
      )
      .where((eb) =>
        eb.or([
          eb("comparisonDeos.modelId", "!=", ORIGINAL_MODEL_ID),
          eb("comparisonDer.nodeEntryOutputHash", "=", "ne.outputHash"),
        ]),
      )
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
      await prisma.$transaction([
        prisma.datasetEvalResult.update({
          where: { id: firstResult.id },
          data: {
            score: completeCombinedResult.firstResultScore,
            explanation: completeCombinedResult.firstResultExplanation,
            judge: completeCombinedResult.judge,
            wasFirst: completeCombinedResult.firstResultWasFirst,
            nodeEntryOutputHash: nodeEntry.outputHash,
            status: "COMPLETE",
            errorMessage: null,
          },
        }),
        prisma.datasetEvalResult.update({
          where: { id: secondResult.id },
          data: {
            score: completeCombinedResult.secondResultScore,
            explanation: completeCombinedResult.secondResultExplanation,
            judge: completeCombinedResult.judge,
            wasFirst: !completeCombinedResult.firstResultWasFirst,
            nodeEntryOutputHash: nodeEntry.outputHash,
            status: "COMPLETE",
            errorMessage: null,
          },
        }),
      ]);
      return;
    }

    try {
      const input = await prisma.datasetEntryInput.findUnique({
        where: { hash: nodeEntry.inputHash },
      });

      if (!input) {
        await prisma.datasetEvalResult.updateMany({
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

      for (const result of [firstResult, secondResult]) {
        try {
          if (result.modelId !== ORIGINAL_MODEL_ID) {
            const entry = await kysely
              .selectFrom("FineTuneTestingEntry as ftte")
              .where("ftte.modelId", "=", result.modelId)
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
          } else {
            const entry = await kysely
              .selectFrom("NodeEntry as ne")
              .where("ne.id", "=", nodeEntryId)
              .innerJoin("DatasetEntryOutput as deo", "deo.hash", "ne.outputHash")
              .select(["deo.output"])
              .executeTakeFirstOrThrow();
            outputs.push(entry.output);
          }
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

      const [firstOutput, secondOutput] = outputs;
      if (!firstOutput || !secondOutput) {
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

      if (outputsAreEqual(firstOutput, secondOutput)) {
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

      const datasetEval = await kysely
        .selectFrom("DatasetEvalOutputSource as deos")
        .where("deos.id", "=", firstOutputSourceId)
        .innerJoin("DatasetEval as de", "de.id", "deos.datasetEvalId")
        .innerJoin("Dataset as d", "d.id", "de.datasetId")
        .select(["de.instructions", "d.projectId"])
        .executeTakeFirst();

      if (!datasetEval) return;

      let args;

      let judgementInput: ChatCompletionCreateParams | null = null;

      try {
        judgementInput = constructJudgementInput(
          input,
          firstOutput as JsonObject,
          secondOutput as JsonObject,
          datasetEval.instructions,
        );

        const response = await getOpenaiCompletion(datasetEval.projectId, judgementInput);

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
            judge: judgementInput?.model,
          },
        });

        throw e;
      }

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

      await prisma.$transaction([
        prisma.datasetEvalResult.update({
          where: { id: firstResult.id },
          data: {
            status: "COMPLETE",
            explanation,
            score: score1,
            wasFirst: true,
            judge: judgementInput?.model,
          },
        }),
        prisma.datasetEvalResult.update({
          where: { id: secondResult.id },
          data: {
            status: "COMPLETE",
            explanation,
            score: score2,
            wasFirst: false,
            judge: judgementInput?.model,
          },
        }),
      ]);
    } catch (e) {
      console.error("error in evaluateTestSetEntries", e);

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
      throw e;
    }
  },
  specDefaults: {
    priority: 5,
    maxAttempts: 50,
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
    input.model = "gpt-4-0125-preview";
  }

  return input;
};

const outputsAreEqual = (
  firstOutput: DatasetEntryOutput["output"],
  secondOutput: DatasetEntryOutput["output"],
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
  const { messages, tool_choice, tools } = typedDatasetEntryInput(datasetEntryInput);
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

const getOutputHashes = async ({
  nodeEntry,
  modelId1,
  modelId2,
}: {
  nodeEntry: NodeEntry;
  modelId1: string;
  modelId2: string;
}) => {
  const getOutputHash = async ({ modelId }: { modelId: string }) => {
    if (modelId !== ORIGINAL_MODEL_ID) {
      return kysely
        .selectFrom("FineTuneTestingEntry as ftte")
        .where("ftte.modelId", "=", modelId)
        .where("ftte.inputHash", "=", nodeEntry.inputHash)
        .leftJoin("FineTune as ft", "ft.id", "ftte.fineTuneId")
        .innerJoin("DatasetEntryOutput as deo", "deo.hash", "ftte.outputHash")
        .select(["ftte.outputHash"])
        .executeTakeFirst()
        .then((entry) => entry?.outputHash);
    } else {
      return kysely
        .selectFrom("NodeEntry as ne")
        .where("ne.id", "=", nodeEntry.id)
        .select(["ne.outputHash"])
        .executeTakeFirst()
        .then((entry) => entry?.outputHash);
    }
  };

  // Ensure output has already been generated
  const [existingFirstOutputHash, existingSecondOutputHash] = await Promise.all([
    getOutputHash({ modelId: modelId1 }),
    getOutputHash({ modelId: modelId2 }),
  ]);

  const generationPromises = [];

  if (!existingFirstOutputHash) {
    generationPromises.push(
      generateEntry({
        modelId: modelId1,
        nodeEntryId: nodeEntry.id,
      }),
    );
  }

  if (!existingSecondOutputHash) {
    generationPromises.push(
      generateEntry({
        modelId: modelId2,
        nodeEntryId: nodeEntry.id,
      }),
    );
  }

  await Promise.all(generationPromises);

  return Promise.all([getOutputHash({ modelId: modelId1 }), getOutputHash({ modelId: modelId2 })]);
};
