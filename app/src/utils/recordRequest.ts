import type { ChatCompletion, ChatCompletionChunk } from "openai/resources";
import { Stream } from "openai/streaming";
import mergeChunks from "openpipe/openai/mergeChunks";
import { z } from "zod";
import { type FineTune, Prisma, UsageType } from "@prisma/client";
import { captureException } from "@sentry/node";
import { v4 as uuidv4 } from "uuid";

import { calculateCost } from "~/server/fineTuningProviders/supportedModels";
import { prisma } from "~/server/db";
import { typedFineTune } from "~/types/dbColumns.types";
import { chatCompletionOutput, type chatCompletionInput } from "~/types/shared.types";
import { posthogServerClient } from "./analytics/serverAnalytics";
import {
  countLlamaInputTokens,
  countLlamaOutputTokens,
  countOpenAIChatTokens,
} from "./countTokens";
import { default as openAIModelProvider } from "~/modelProviders/openai-ChatCompletion";
import { type BaseModel } from "~/server/fineTuningProviders/types";

export const recordUsage = async ({
  projectId,
  inputPayload,
  completion,
  logRequest,
  fineTune,
  tags,
}: {
  projectId: string;
  inputPayload: z.infer<typeof chatCompletionInput>;
  completion: unknown;
  logRequest?: boolean;
  fineTune?: FineTune;
  tags?: Record<string, string>;
}) => {
  if (completion instanceof Stream) {
    let merged: ChatCompletion | null = null;
    for await (const chunk of completion) {
      merged = mergeChunks(merged, chunk as ChatCompletionChunk);
    }
    completion = merged;
  }
  const parsedCompletion = chatCompletionOutput.safeParse(completion);
  const usage = parsedCompletion.success
    ? calculateUsage({
        inputPayload,
        completion: parsedCompletion.data,
        fineTune,
      })
    : undefined;

  if (fineTune) {
    await prisma.usageLog
      .create({
        data: {
          fineTuneId: fineTune.id,
          type: UsageType.EXTERNAL,
          inputTokens: usage?.inputTokens ?? 0,
          outputTokens: usage?.outputTokens ?? 0,
          cost: usage?.cost ?? 0,
        },
      })
      .catch((error) => captureException(error));

    posthogServerClient?.capture({
      distinctId: projectId,
      event: "fine-tune-usage",
      properties: {
        model: inputPayload.model,
        ...usage,
      },
    });
  }

  if (logRequest) {
    await recordLoggedCall({
      projectId,
      usage,
      requestedAt: Date.now(),
      reqPayload: inputPayload,
      respPayload: completion,
      tags,
      statusCode: 200,
    });
  }
};

export type CalculatedUsage = {
  inputTokens: number;
  outputTokens: number;
  cost?: number;
};

export const calculateUsage = ({
  inputPayload,
  completion,
  fineTune,
}: {
  inputPayload: z.infer<typeof chatCompletionInput>;
  completion: ChatCompletion;
  fineTune?: FineTune;
}): CalculatedUsage | undefined => {
  let provider: BaseModel["provider"] | undefined = undefined;
  let baseModel: BaseModel["baseModel"] | undefined = undefined;

  if (fineTune) {
    const typedFT = typedFineTune(fineTune);
    provider = typedFT.provider;
    baseModel = typedFT.baseModel;
  } else if (inputPayload.model.startsWith("ft:")) {
    provider = "openai";
    baseModel = "gpt-3.5-turbo-1106";
  }

  // Return usage for non-fine-tuned OpenAI models
  if (!provider || !baseModel) {
    return openAIModelProvider.getUsage(inputPayload, completion) ?? undefined;
  }

  let inputTokens;
  let outputTokens;

  if (completion.usage) {
    inputTokens = completion.usage.prompt_tokens;
    outputTokens = completion.usage.completion_tokens;
  } else if (baseModel === "gpt-3.5-turbo-0613" || baseModel === "gpt-3.5-turbo-1106") {
    inputTokens = countOpenAIChatTokens(baseModel, inputPayload.messages);
    outputTokens = completion.choices[0]?.message
      ? countOpenAIChatTokens(baseModel, [completion.choices[0].message])
      : 0;
  } else {
    inputTokens = countLlamaInputTokens(inputPayload);
    outputTokens = completion.choices[0]?.message
      ? countLlamaOutputTokens(completion.choices[0]?.message)
      : 0;
  }

  return {
    inputTokens,
    outputTokens,
    cost: calculateCost(
      {
        provider,
        baseModel,
      } as BaseModel,
      0,
      inputTokens,
      outputTokens,
    ),
  };
};

export const reqValidator = z.object({
  model: z.string(),
  messages: z.array(z.any()),
});

export const recordLoggedCall = async ({
  projectId,
  usage,
  requestedAt,
  receivedAt,
  reqPayload,
  respPayload,
  statusCode,
  errorMessage,
  tags = {},
}: {
  projectId: string;
  usage?: CalculatedUsage;
  requestedAt: number;
  receivedAt?: number;
  reqPayload: unknown;
  respPayload?: unknown;
  statusCode?: number;
  errorMessage?: string;
  tags?: Record<string, string>;
}) => {
  const newLoggedCallId = uuidv4();

  const validatedReqPayload = await reqValidator.spa(reqPayload);
  const validatedRespPayload = await chatCompletionOutput.spa(respPayload);

  try {
    await prisma.loggedCall.create({
      data: {
        id: newLoggedCallId,
        projectId,
        requestedAt: new Date(requestedAt),
        model: validatedReqPayload.success ? validatedReqPayload.data.model : null,
        receivedAt: receivedAt ? new Date(receivedAt) : undefined,
        reqPayload: (reqPayload === null ? Prisma.JsonNull : reqPayload) as Prisma.InputJsonValue,
        respPayload: (respPayload === null
          ? Prisma.JsonNull
          : respPayload) as Prisma.InputJsonValue,
        statusCode: statusCode,
        errorMessage: errorMessage,
        durationMs: receivedAt ? receivedAt - requestedAt : undefined,
        inputTokens: usage?.inputTokens,
        outputTokens: usage?.outputTokens,
        cost: usage?.cost,
        completionId: validatedRespPayload.success ? validatedRespPayload.data.id : null,
      },
    });
  } catch (e) {
    throw new Error(`Failed to create logged call: ${(e as Error).message}`);
  }

  await createTags(projectId, newLoggedCallId, tags);
};

async function createTags(projectId: string, loggedCallId: string, tags: Record<string, string>) {
  const tagsToCreate = Object.entries(tags).map(([name, value]) => ({
    projectId,
    loggedCallId,
    name: name.replaceAll(/[^a-zA-Z0-9_$.]/g, "_"),
    value,
  }));
  await prisma.loggedCallTag.createMany({
    data: tagsToCreate,
  });
}
