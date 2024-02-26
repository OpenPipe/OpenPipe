import type { ChatCompletion, ChatCompletionChunk } from "openai/resources";
import { Stream } from "openai/streaming";
import mergeChunks from "openpipe-dev/src/openai/mergeChunks";
import { z } from "zod";
import { type FineTune, Prisma, UsageType } from "@prisma/client";
import { captureException } from "@sentry/node";
import { v4 as uuidv4 } from "uuid";

import { calculateCost } from "~/server/fineTuningProviders/supportedModels";
import { kysely, prisma } from "~/server/db";
import { typedFineTune } from "~/types/dbColumns.types";
import { chatCompletionOutput, type chatCompletionInput } from "~/types/shared.types";
import {
  countLlamaInputTokens,
  countLlamaOutputTokens,
  countOpenAIChatTokens,
} from "./countTokens";
import { default as openAIModelProvider } from "~/modelProviders/openai-ChatCompletion";
import { type BaseModel } from "~/server/fineTuningProviders/types";
import { recordOngoingRequestEnd } from "./rateLimit/concurrencyRateLimits";

export const recordUsage = async ({
  projectId,
  requestedAt,
  receivedAt,
  cacheHit,
  inputPayload,
  completion,
  logRequest,
  fineTune,
  tags,
  ongoingRequestId,
}: {
  projectId: string;
  requestedAt: number;
  receivedAt: number;
  cacheHit: boolean;
  inputPayload: z.infer<typeof chatCompletionInput>;
  completion: unknown;
  logRequest?: boolean;
  fineTune?: FineTune;
  tags?: Record<string, string>;
  ongoingRequestId?: string;
}) => {
  if (completion instanceof Stream) {
    let merged: ChatCompletion | null = null;
    for await (const chunk of completion) {
      merged = mergeChunks(merged, chunk as ChatCompletionChunk);
    }
    completion = merged;
  }

  void recordOngoingRequestEnd(ongoingRequestId);

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
          projectId: fineTune.projectId,
          baseModel: fineTune.baseModel,
          type: cacheHit ? UsageType.CACHE_HIT : UsageType.EXTERNAL,
          inputTokens: usage?.inputTokens ?? 0,
          outputTokens: usage?.outputTokens ?? 0,
          cost: cacheHit ? 0 : usage?.cost ?? 0,
          inputCost: cacheHit ? 0 : usage?.inputCost ?? 0,
          outputCost: cacheHit ? 0 : usage?.outputCost ?? 0,
          billable: fineTune.provider === "openpipe",
        },
      })
      .catch((error) => captureException(error));
  }

  if (logRequest) {
    await recordLoggedCall({
      projectId,
      usage,
      requestedAt,
      receivedAt,
      cacheHit,
      reqPayload: inputPayload,
      respPayload: completion,
      tags,
      statusCode: 200,
    });
  }
};

export type CalculatedUsage = {
  inputTokens?: number;
  outputTokens?: number;
  cost?: number;
  inputCost?: number;
  outputCost?: number;
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

  const { cost, inputCost, outputCost } = calculateCost(
    {
      provider,
      baseModel,
    } as BaseModel,
    0,
    inputTokens,
    outputTokens,
  );

  return {
    inputTokens,
    outputTokens,
    cost,
    inputCost,
    outputCost,
  };
};

export const reqValidator = z.object({
  model: z.string(),
  messages: z.array(z.any()),
  stream: z.boolean().default(false),
});

export const recordLoggedCall = async ({
  projectId,
  usage,
  requestedAt,
  receivedAt,
  cacheHit,
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
  cacheHit: boolean;
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
        receivedAt: receivedAt ? new Date(receivedAt) : undefined,
        cacheHit: cacheHit ?? false,
        model: validatedReqPayload.success ? validatedReqPayload.data.model : null,
        reqPayload: (reqPayload === null ? Prisma.JsonNull : reqPayload) as Prisma.InputJsonValue,
        respPayload: (respPayload === null
          ? Prisma.JsonNull
          : respPayload) as Prisma.InputJsonValue,
        statusCode: statusCode,
        errorMessage: errorMessage,
        durationMs: receivedAt && receivedAt - requestedAt,
        inputTokens: usage?.inputTokens,
        outputTokens: usage?.outputTokens,
        cost: usage?.cost,
        completionId: validatedRespPayload.success ? validatedRespPayload.data.id : null,
      },
    });
  } catch (e) {
    throw new Error(`Failed to create logged call: ${(e as Error).message}`);
  }

  if (Object.keys(tags).length > 0) {
    await createTags(projectId, newLoggedCallId, tags);
  }
};

async function createTags(projectId: string, loggedCallId: string, tags: Record<string, string>) {
  const tagsToCreate = Object.entries(tags).map(([name, value]) => ({
    id: uuidv4(),
    projectId,
    loggedCallId,
    name: name.replaceAll(/[^a-zA-Z0-9_$.]/g, "_"),
    value,
  }));

  await kysely.insertInto("LoggedCallTag").values(tagsToCreate).execute();

  const tagNames = tagsToCreate.map((tag) => tag.name);

  void recordTagNames(projectId, tagNames).catch((e) => captureException(e));
}

export async function recordTagNames(projectId: string, tagNames: string[]) {
  const project = await kysely
    .selectFrom("Project")
    .where("id", "=", projectId)
    .select(["tagNames"])
    .executeTakeFirst();

  if (!project) return;

  const existingTagNames = project.tagNames ?? [];

  const tagsNamesToAdd = tagNames.filter((tagName) => !existingTagNames.includes(tagName));

  // optimistically assume that no two requests will simultaneously add different tags
  // this avoids row level locks
  if (tagsNamesToAdd.length) {
    await kysely
      .updateTable("Project")
      .set({
        tagNames: [...existingTagNames, ...tagsNamesToAdd],
      })
      .where("id", "=", projectId)
      .execute();
  }
}
