import { v4 as uuidv4 } from "uuid";
import { type ChatCompletionCreateParams } from "openai/resources";

import { prisma } from "~/server/db";
import { typedLoggedCall } from "~/types/dbColumns.types";
import { getOpenaiCompletion } from "../utils/openai";
import defineTask from "./defineTask";
import {
  convertFunctionMessagesToToolCall,
  convertFunctionCallToToolChoice,
  convertFunctionsToTools,
} from "../utils/convertFunctionCalls";
import { updateDatasetPruningRuleMatches } from "../utils/updatePruningRuleMatches";
import { countLlamaInputTokens, countLlamaOutputTokens } from "~/utils/countTokens";

export type RelabelLoggedCallJob = {
  projectId: string;
  loggedCallId: string;
  importId: string;
};

export const relabelLoggedCall = defineTask<RelabelLoggedCallJob>({
  id: "relabelLoggedCall",
  handler: async (task) => {
    const { projectId, loggedCallId, importId } = task;

    const loggedCall = await prisma.loggedCall.findUnique({
      where: { id: loggedCallId },
    });

    if (!loggedCall) return;

    let tLoggedCall;
    try {
      tLoggedCall = typedLoggedCall(loggedCall);
    } catch (e) {
      return;
    }

    if (!tLoggedCall.model || !tLoggedCall.model.startsWith("openpipe:")) return;

    const modelSlug = tLoggedCall.model.split(":")[1];

    const fineTune = await prisma.fineTune.findFirst({
      where: { slug: modelSlug, projectId },
    });

    if (!fineTune) return;

    const input: ChatCompletionCreateParams = {
      model: "gpt-4-0613",
      tool_choice:
        tLoggedCall.reqPayload.tool_choice ||
        convertFunctionCallToToolChoice(tLoggedCall.reqPayload.function_call) ||
        undefined,
      tools: tLoggedCall.reqPayload.tools?.length
        ? tLoggedCall.reqPayload.tools
        : convertFunctionsToTools(tLoggedCall.reqPayload.functions),
      messages: convertFunctionMessagesToToolCall(tLoggedCall.reqPayload.messages),
      response_format: tLoggedCall.reqPayload.response_format,
    };

    const completion = await getOpenaiCompletion(projectId, input);

    const completionMessage = completion.choices[0]?.message;
    if (!completionMessage) throw new Error("No completion returned");

    const importTime = Date.now();
    const persistentId = uuidv4();

    const entry = await prisma.datasetEntry.create({
      data: {
        loggedCallId,
        datasetId: fineTune.datasetId,
        tool_choice: input.tool_choice as object,
        tools: input.tools as object[],
        messages: input.messages as object[],
        response_format: input.response_format as object,
        inputTokens: countLlamaInputTokens(input),
        output: completionMessage as object,
        outputTokens: countLlamaOutputTokens(completionMessage),
        split: "TRAIN",
        importId,
        provenance: "REQUEST_LOG",
        persistentId,
        sortKey: `${importTime}-${persistentId}`,
      },
    });

    await updateDatasetPruningRuleMatches(fineTune.datasetId, new Date(0), [entry.id]);
  },
  specDefaults: {
    priority: 5,
  },
});

export const queueRelabelLoggedCalls = async ({
  projectId,
  loggedCallIds,
}: {
  projectId: string;
  loggedCallIds: string[];
}) => {
  const importId = new Date().toISOString();

  for (const loggedCallId of loggedCallIds) {
    await relabelLoggedCall.enqueue({ projectId, loggedCallId, importId });
  }
};
