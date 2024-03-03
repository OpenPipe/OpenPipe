import { isEqual, mean } from "lodash-es";
import { type ChatCompletionMessage } from "openai/resources/chat";
import { v4 as uuidv4 } from "uuid";

import { kysely } from "../db";
import { type typedNodeEntry } from "~/types/dbColumns.types";

export const FIELD_COMPARISON_EVAL_NAME = "Field Comparison";

export const saveFieldComparisonScore = async ({
  datasetId,
  persistentId,
  nodeEntryInputHash,
  score,
  modelId,
}: {
  datasetId: string;
  persistentId: string;
  nodeEntryInputHash: string;
  score: number;
  modelId: string;
}) => {
  let datasetEvalId = "";

  await kysely.transaction().execute(async (tx) => {
    const datasetEval = await tx
      .selectFrom("DatasetEval")
      .where("datasetId", "=", datasetId)
      .where("name", "=", FIELD_COMPARISON_EVAL_NAME)
      .select(["id"])
      .executeTakeFirst();

    if (datasetEval) {
      datasetEvalId = datasetEval.id;
    } else {
      datasetEvalId = uuidv4();
      await tx
        .insertInto("DatasetEval")
        .values({
          id: datasetEvalId,
          datasetId,
          name: FIELD_COMPARISON_EVAL_NAME,
          type: "FIELD_COMPARISON",
          updatedAt: new Date(),
        })
        .onConflict((oc) => oc.columns(["datasetId", "name"]).doNothing())
        .execute();
    }
  });

  let datasetEvalNodeEntryId = "";

  await kysely.transaction().execute(async (tx) => {
    const datasetEvalNodeEntry = await tx
      .selectFrom("DatasetEvalNodeEntry")
      .where("datasetEvalId", "=", datasetEvalId)
      .where("nodeEntryPersistentId", "=", persistentId)
      .select(["id"])
      .executeTakeFirst();

    if (datasetEvalNodeEntry) {
      datasetEvalNodeEntryId = datasetEvalNodeEntry.id;
    } else {
      datasetEvalNodeEntryId = uuidv4();
      await tx
        .insertInto("DatasetEvalNodeEntry")
        .values({
          id: datasetEvalNodeEntryId,
          datasetEvalId: datasetEvalId,
          nodeEntryPersistentId: persistentId,
          updatedAt: new Date(),
        })
        .onConflict((oc) => oc.columns(["datasetEvalId", "nodeEntryPersistentId"]).doNothing())
        .execute();
    }
  });

  let datasetEvalOutputSourceId = "";

  await kysely.transaction().execute(async (tx) => {
    const datasetEvalOutputSource = await tx
      .selectFrom("DatasetEvalOutputSource")
      .where("datasetEvalId", "=", datasetEvalId)
      .where("modelId", "=", modelId)
      .select(["id"])
      .executeTakeFirst();

    if (datasetEvalOutputSource) {
      datasetEvalOutputSourceId = datasetEvalOutputSource.id;
    } else {
      datasetEvalOutputSourceId = uuidv4();
      await tx
        .insertInto("DatasetEvalOutputSource")
        .values({
          id: datasetEvalOutputSourceId,
          datasetEvalId,
          modelId,
          updatedAt: new Date(),
        })
        .onConflict((oc) => oc.columns(["datasetEvalId", "modelId"]).doNothing())
        .execute();
    }
  });

  await kysely.transaction().execute(async (tx) => {
    const datasetEvalResult = await tx
      .selectFrom("DatasetEvalResult")
      .where("datasetEvalNodeEntryId", "=", datasetEvalNodeEntryId)
      .where("datasetEvalOutputSourceId", "=", datasetEvalOutputSourceId)
      .select(["id"])
      .executeTakeFirst();

    if (datasetEvalResult) {
      await tx
        .updateTable("DatasetEvalResult")
        .set({
          nodeEntryInputHash,
          score,
          status: "COMPLETE",
          updatedAt: new Date(),
        })
        .where("id", "=", datasetEvalResult.id)
        .execute();
    } else {
      await kysely
        .insertInto("DatasetEvalResult")
        .values({
          id: uuidv4(),
          datasetEvalNodeEntryId: datasetEvalNodeEntryId,
          datasetEvalOutputSourceId: datasetEvalOutputSourceId,
          nodeEntryInputHash,
          score,
          status: "COMPLETE",
          updatedAt: new Date(),
        })
        .execute();
    }
  });
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
