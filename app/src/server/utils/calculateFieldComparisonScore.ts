import { isEqual, mean } from "lodash-es";
import { type ChatCompletionMessage } from "openai/resources/chat";
import { v4 as uuidv4 } from "uuid";

import { type typedNodeEntry } from "./nodes/node.types";
import { kysely, prisma } from "../db";

export const FIELD_COMPARISON_EVAL_NAME = "Field Comparison";

export const saveFieldComparisonScore = async ({
  datasetId,
  persistentId,
  score,
  modelId,
}: {
  datasetId: string;
  persistentId: string;
  score: number;
  modelId: string;
}) => {
  let datasetEval;
  let numDatasetEvalTries = 0;
  while (!datasetEval && numDatasetEvalTries < 2) {
    try {
      datasetEval = await prisma.datasetEval.upsert({
        where: {
          datasetId_name: { datasetId: datasetId, name: FIELD_COMPARISON_EVAL_NAME },
        },
        create: {
          datasetId,
          name: FIELD_COMPARISON_EVAL_NAME,
          type: "FIELD_COMPARISON",
        },
        update: {},
      });
    } catch (e) {
      // If we attempt to create the same eval from multiple processes at the same time, we may get a unique constraint error.
      numDatasetEvalTries++;
    }
  }

  if (!datasetEval) throw new Error("Error retrieving dataset eval");

  const datasetEvalNodeEntryId = uuidv4();

  await kysely
    .insertInto("DatasetEvalNodeEntry")
    .values({
      id: datasetEvalNodeEntryId,
      datasetEvalId: datasetEval.id,
      nodeEntryPersistentId: persistentId,
      updatedAt: new Date(),
    })
    .onConflict((oc) => oc.columns(["datasetEvalId", "nodeEntryPersistentId"]).doNothing())
    .execute();

  const datasetEvalNodeEntry = await prisma.datasetEvalNodeEntry.findFirstOrThrow({
    where: { datasetEvalId: datasetEval.id, nodeEntryPersistentId: persistentId },
  });

  let datasetEvalOutputSource;
  let numDatatsetEvalOutputSourceTries = 0;
  while (!datasetEvalOutputSource && numDatatsetEvalOutputSourceTries < 2) {
    try {
      datasetEvalOutputSource = await prisma.datasetEvalOutputSource.upsert({
        where: {
          datasetEvalId_modelId: { datasetEvalId: datasetEval.id, modelId },
        },
        create: {
          datasetEvalId: datasetEval.id,
          modelId,
        },
        update: {},
      });
    } catch (e) {
      numDatatsetEvalOutputSourceTries++;
    }
  }

  if (!datasetEvalOutputSource) throw new Error("Error retrieving dataset eval details");

  const datasetEvalResult = await prisma.newDatasetEvalResult.findFirst({
    where: {
      datasetEvalNodeEntryId: datasetEvalNodeEntry.id,
      datasetEvalOutputSourceId: datasetEvalOutputSource.id,
    },
  });

  // Prisma doesn't support upserting for records with a foreign key that contains a nullable value
  if (datasetEvalResult) {
    await prisma.newDatasetEvalResult.update({
      where: { id: datasetEvalResult.id },
      data: {
        score,
        status: "COMPLETE",
      },
    });
  } else {
    await prisma.newDatasetEvalResult.create({
      data: {
        datasetEvalNodeEntryId: datasetEvalNodeEntry.id,
        datasetEvalOutputSourceId: datasetEvalOutputSource.id,
        score,
        status: "COMPLETE",
      },
    });
  }
};

export const calculateFieldComparisonScore = (
  nodeEntry: ReturnType<typeof typedNodeEntry>,
  fineTuneTestingEntryOutput: ChatCompletionMessage,
) => {
  if (nodeEntry.response_format?.type === "json_object" && !nodeEntry.output?.tool_calls) {
    return calculateToolCallScore(
      { name: "content", arguments: nodeEntry.output?.content ?? "" },
      { name: "content", arguments: fineTuneTestingEntryOutput?.content ?? "" },
    );
  } else if (nodeEntry.output?.tool_calls) {
    // const generatedToolCalls = Object.fromEntries(
    //   fineTuneTestingEntryOutput?.tool_calls?.map((toolCall) => [
    //     toolCall.function.name,
    //     toolCall.function.arguments,
    //   ]) ?? [],
    // );

    const generatedToolCalls: Record<string, string[]> = {};

    for (const toolCall of fineTuneTestingEntryOutput?.tool_calls ?? []) {
      const argumentsList = generatedToolCalls[toolCall.function.name] ?? [];
      argumentsList.push(toolCall.function.arguments);
      generatedToolCalls[toolCall.function.name] = argumentsList;
    }

    const scores = nodeEntry.output?.tool_calls.map((toolCall) => {
      const argumentsList = generatedToolCalls[toolCall.function.name];
      if (!argumentsList) return 0;
      // return max score of all generated tool calls with the same name
      return Math.max(
        ...argumentsList.map((args) =>
          calculateToolCallScore(toolCall.function, {
            name: toolCall.function.name,
            arguments: args,
          }),
        ),
      );
      // return calculateToolCallScore(toolCall.function, {
      //   name: toolCall.function.name,
      //   arguments: generatedToolCall,
      // });
    });

    return mean(scores);
  } else {
    return null;
  }
};

// If function names don't match, return 0
// If function names match and there are no args, return 1
// If function names match and there are args, return (num matching args / num args)
export const calculateToolCallScore = (
  originalFunctionCall: ChatCompletionMessage["function_call"],
  generatedFunctionCall: ChatCompletionMessage["function_call"],
) => {
  console.log("originalFunctionCall", originalFunctionCall);
  console.log("generatedFunctionCall", generatedFunctionCall);
  // If function names don't match, return 0
  if (!originalFunctionCall || !generatedFunctionCall) return 0;
  // If neither have args, then congrats, we matched them.
  if (!originalFunctionCall.arguments && !generatedFunctionCall.arguments) return 1;
  // If one has args and the other doesn't, then they don't match.
  if (!originalFunctionCall.arguments || !generatedFunctionCall.arguments) return 0;
  let parsedOriginalArgs: Record<string, unknown> | undefined;
  try {
    parsedOriginalArgs = JSON.parse(originalFunctionCall.arguments);
  } catch (e) {
    // Original args were off, so we can't compare them
    return 1;
  }
  if (!parsedOriginalArgs) return 1;
  let parsedGeneratedArgs: Record<string, unknown> | undefined;
  try {
    parsedGeneratedArgs = JSON.parse(generatedFunctionCall.arguments);
  } catch (e) {
    return 0;
  }
  if (!parsedGeneratedArgs) return 0;
  try {
    const numOriginalArgs = Object.keys(parsedOriginalArgs).length;

    // If there are no args, then congrats, we matched them.
    if (numOriginalArgs === 0) return 1;

    const numMatchingArgs = Object.keys(parsedOriginalArgs).filter((key) =>
      isEqual(parsedOriginalArgs?.[key], parsedGeneratedArgs?.[key]),
    ).length;
    return numMatchingArgs / numOriginalArgs;
  } catch (e) {
    return 0;
  }
};
