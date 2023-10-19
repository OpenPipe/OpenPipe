import { type Prisma } from "@prisma/client";
import { type JsonValue } from "type-fest";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import { prisma } from "~/server/db";
import { hashRequest } from "~/server/utils/hashObject";
import { default as openaAIModelProvider } from "~/modelProviders/openai-ChatCompletion";
import { default as fineTunedModelProvider } from "~/modelProviders/fine-tuned";
import {
  type ChatCompletion,
  type ChatCompletionCreateParams,
} from "openai/resources/chat/completions";
import { createOpenApiRouter, openApiProtectedProc } from "./openApiTrpc";
import { TRPCError } from "@trpc/server";
import { getCompletion, getStringsToPrune } from "~/modelProviders/fine-tuned/getCompletion";
import { captureFineTuneUsage } from "~/utils/analytics/serverAnalytics";
import { getCompletion2 } from "~/modelProviders/fine-tuned/getCompletion-2";
import {
  chatCompletionInput,
  chatCompletionOutput,
  chatMessage,
  functionCallInput,
  functionsInput,
} from "~/types/shared.types";
import { calculateFineTuneUsageCost } from "~/utils/baseModels";

const reqValidator = z.object({
  model: z.string(),
  messages: z.array(z.any()),
});

const respValidator = z.object({
  id: z.string(),
  model: z.string(),
  choices: z.array(
    z.object({
      finish_reason: z.string(),
    }),
  ),
});

export const v1ApiRouter = createOpenApiRouter({
  checkCache: openApiProtectedProc
    .meta({
      openapi: {
        method: "POST",
        path: "/check-cache",
        description: "DEPRECATED: we no longer support prompt caching.",
        protect: true,
        deprecated: true,
      },
    })
    .input(
      z.object({
        requestedAt: z.number().describe("Unix timestamp in milliseconds"),
        reqPayload: z.unknown().describe("JSON-encoded request payload"),
        tags: z
          .record(z.string())
          .optional()
          .describe(
            'Extra tags to attach to the call for filtering. Eg { "userId": "123", "promptId": "populate-title" }',
          )
          .default({}),
      }),
    )
    .output(
      z.object({
        respPayload: z.unknown().optional().describe("JSON-encoded response payload"),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const reqPayload = await reqValidator.spa(input.reqPayload);
      const cacheKey = hashRequest(ctx.key.projectId, reqPayload as JsonValue);

      const existingResponse = await prisma.loggedCallModelResponse.findFirst({
        where: { cacheKey },
        include: { originalLoggedCall: true },
        orderBy: { requestedAt: "desc" },
      });

      if (!existingResponse) return { respPayload: null };

      const newCall = await prisma.loggedCall.create({
        data: {
          projectId: ctx.key.projectId,
          requestedAt: new Date(input.requestedAt),
          cacheHit: true,
          modelResponseId: existingResponse.id,
        },
      });

      await createTags(newCall.projectId, newCall.id, input.tags);
      return {
        respPayload: existingResponse.respPayload,
      };
    }),

  createChatCompletion: openApiProtectedProc
    .meta({
      openapi: {
        method: "POST",
        path: "/chat/completions",
        description: "Create completion for a prompt",
        protect: true,
      },
    })
    .input(
      // TODO: replace this whole mess with just `chatCompletionInput` once
      // no one is using the `reqPayload` field anymore.
      z.object({
        reqPayload: chatCompletionInput
          .optional()
          .describe("DEPRECATED. Use the top-level fields instead"),
        model: z.string().optional(),
        messages: z.array(chatMessage).optional(),
        function_call: functionCallInput,
        functions: functionsInput,
        n: z.number().nullable().optional(),
        max_tokens: z.number().optional(),
        temperature: z.number().nullable().optional(),
        stream: z.boolean().nullable().optional(),
      }),
    )
    .output(chatCompletionOutput)
    .mutation(async ({ input, ctx }): Promise<ChatCompletion> => {
      const { key } = ctx;

      const inputPayload =
        "reqPayload" in input
          ? chatCompletionInput.parse(input.reqPayload)
          : chatCompletionInput.parse(input);

      const modelSlug = inputPayload.model.replace("openpipe:", "");
      const fineTune = await prisma.fineTune.findUnique({
        where: { slug: modelSlug },
      });

      if (!fineTune) {
        throw new TRPCError({ message: "The model does not exist", code: "NOT_FOUND" });
      }
      if (fineTune.projectId !== key.projectId) {
        throw new TRPCError({
          message: "The model does not belong to this project",
          code: "FORBIDDEN",
        });
      }

      try {
        let completion;
        if (fineTune.pipelineVersion === 0) {
          if (!fineTune.inferenceUrls.length) {
            throw new TRPCError({
              message: "The model is not set up for inference",
              code: "BAD_REQUEST",
            });
          }
          const stringsToPrune = await getStringsToPrune(fineTune.id);

          completion = await getCompletion(inputPayload, fineTune.inferenceUrls, stringsToPrune);
        } else if (fineTune.pipelineVersion >= 1 && fineTune.pipelineVersion <= 2) {
          completion = await getCompletion2(fineTune, inputPayload);
        } else {
          throw new TRPCError({
            message: "The model is not set up for inference",
            code: "BAD_REQUEST",
          });
        }
        const inputTokens = completion.usage?.prompt_tokens ?? 0;
        const outputTokens = completion.usage?.completion_tokens ?? 0;
        await prisma.usageLog.create({
          data: {
            fineTuneId: fineTune.id,
            type: UsageType.INFERENCE,
            inputTokens,
            outputTokens,
            cost: calculateFineTuneUsageCost({
              inputTokens,
              outputTokens,
              baseModel: fineTune.baseModel,
            }),
            completionId: completion.id,
          },
        });
        return completion;
      } catch (error: unknown) {
        console.error(error);
        throw new TRPCError({
          message: `Failed to get completion: ${(error as Error).message}`,
          code: "BAD_REQUEST",
        });
      }
    }),

  report: openApiProtectedProc
    .meta({
      openapi: {
        method: "POST",
        path: "/report",
        description: "Report an API call",
        protect: true,
      },
    })
    .input(
      z.object({
        requestedAt: z.number().describe("Unix timestamp in milliseconds"),
        receivedAt: z.number().describe("Unix timestamp in milliseconds"),
        reqPayload: z.unknown().describe("JSON-encoded request payload"),
        respPayload: z.unknown().optional().describe("JSON-encoded response payload"),
        statusCode: z.number().optional().describe("HTTP status code of response"),
        errorMessage: z.string().optional().describe("User-friendly error message"),
        tags: z
          .record(z.string())
          .optional()
          .describe(
            'Extra tags to attach to the call for filtering. Eg { "userId": "123", "promptId": "populate-title" }',
          )
          .default({}),
      }),
    )
    .output(z.object({ status: z.union([z.literal("ok"), z.literal("error")]) }))
    .mutation(async ({ input, ctx }) => {
      const reqPayload = await reqValidator.spa(input.reqPayload);
      const respPayload = await respValidator.spa(input.respPayload);

      const requestHash = hashRequest(ctx.key.projectId, reqPayload as JsonValue);

      const newLoggedCallId = uuidv4();
      const newModelResponseId = uuidv4();

      let usage;
      let model;
      if (reqPayload.success) {
        model = reqPayload.data.model;
        if (model.startsWith("openpipe:")) {
          const fineTune = await prisma.fineTune.findUnique({
            where: { slug: model.replace("openpipe:", "") },
          });
          usage = fineTunedModelProvider.getUsage(
            input.reqPayload as ChatCompletionCreateParams,
            respPayload.success ? (input.respPayload as ChatCompletion) : undefined,
            { baseModel: fineTune?.baseModel },
          );

          captureFineTuneUsage(
            ctx.key.projectId,
            model,
            input.statusCode,
            usage?.inputTokens,
            usage?.outputTokens,
            usage?.cost,
          );
        } else {
          usage = openaAIModelProvider.getUsage(
            input.reqPayload as ChatCompletionCreateParams,
            respPayload.success ? (input.respPayload as ChatCompletion) : undefined,
          );
        }
      }

      await prisma.$transaction([
        prisma.loggedCall.create({
          data: {
            id: newLoggedCallId,
            projectId: ctx.key.projectId,
            requestedAt: new Date(input.requestedAt),
            cacheHit: false,
            model,
          },
        }),
        prisma.loggedCallModelResponse.create({
          data: {
            id: newModelResponseId,
            originalLoggedCallId: newLoggedCallId,
            requestedAt: new Date(input.requestedAt),
            receivedAt: new Date(input.receivedAt),
            reqPayload: input.reqPayload as Prisma.InputJsonValue,
            respPayload: input.respPayload as Prisma.InputJsonValue,
            statusCode: input.statusCode,
            errorMessage: input.errorMessage,
            durationMs: input.receivedAt - input.requestedAt,
            cacheKey: respPayload.success ? requestHash : null,
            inputTokens: usage?.inputTokens,
            outputTokens: usage?.outputTokens,
            cost: usage?.cost,
            completionId: respPayload.success ? respPayload.data.id : null,
          },
        }),
        // Avoid foreign key constraint error by updating the logged call after the model response is created
        prisma.loggedCall.update({
          where: {
            id: newLoggedCallId,
          },
          data: {
            modelResponseId: newModelResponseId,
          },
        }),
      ]);

      await createTags(ctx.key.projectId, newLoggedCallId, input.tags);
      return { status: "ok" };
    }),
  localTestingOnlyGetLatestLoggedCall: openApiProtectedProc
    .meta({
      openapi: {
        method: "GET",
        path: "/local-testing-only-get-latest-logged-call",
        description: "Get the latest logged call (only for local testing)",
        protect: true, // Make sure to protect this endpoint
      },
    })
    .input(z.void())
    .output(
      z
        .object({
          createdAt: z.date(),
          cacheHit: z.boolean(),
          tags: z.record(z.string().nullable()),
          modelResponse: z
            .object({
              id: z.string(),
              statusCode: z.number().nullable(),
              errorMessage: z.string().nullable(),
              reqPayload: z.unknown(),
              respPayload: z.unknown(),
            })
            .nullable(),
        })
        .nullable(),
    )
    .mutation(async ({ ctx }) => {
      if (process.env.NODE_ENV === "production") {
        throw new Error("This operation is not allowed in production environment");
      }

      const latestLoggedCall = await prisma.loggedCall.findFirst({
        where: { projectId: ctx.key.projectId },
        orderBy: { requestedAt: "desc" },
        select: {
          createdAt: true,
          cacheHit: true,
          tags: true,
          id: true,
          modelResponse: {
            select: {
              id: true,
              statusCode: true,
              errorMessage: true,
              reqPayload: true,
              respPayload: true,
            },
          },
        },
      });

      return (
        latestLoggedCall && {
          ...latestLoggedCall,
          tags: Object.fromEntries(latestLoggedCall.tags.map((tag) => [tag.name, tag.value])),
        }
      );
    }),
});

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
