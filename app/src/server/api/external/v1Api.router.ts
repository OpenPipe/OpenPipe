import { UsageType, Prisma } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { type ChatCompletion, type ChatCompletionCreateParams } from "openai/resources/chat";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import { captureException } from "@sentry/node";

import { default as fineTunedModelProvider } from "~/modelProviders/fine-tuned";
import { default as openaAIModelProvider } from "~/modelProviders/openai-ChatCompletion";
import { getCompletion2 } from "~/modelProviders/fine-tuned/getCompletion-2";
import { prisma } from "~/server/db";
import {
  chatCompletionInputReqPayload,
  chatCompletionOutput,
  chatMessage,
  functionCallInput,
  functionsInput,
  toolChoiceInput,
  toolsInput,
} from "~/types/shared.types";
import { posthogServerClient } from "~/utils/analytics/serverAnalytics";
import { calculateFineTuneUsageCost } from "~/utils/baseModels";
import { createOpenApiRouter, openApiProtectedProc } from "./openApiTrpc";

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
    .mutation(({ input, ctx }) => {
      // Return null
      return { respPayload: null };
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
        reqPayload: chatCompletionInputReqPayload
          .optional()
          .describe("DEPRECATED. Use the top-level fields instead"),
        model: z.string().optional(),
        messages: z.array(chatMessage).optional(),
        function_call: functionCallInput,
        functions: functionsInput,
        tool_choice: toolChoiceInput,
        tools: toolsInput,
        n: z.number().nullable().optional(),
        max_tokens: z.number().nullable().optional(),
        temperature: z.number().nullable().optional(),
        stream: z.boolean().nullable().optional(),
      }),
    )
    .output(chatCompletionOutput)
    .mutation(async ({ input, ctx }): Promise<ChatCompletion> => {
      const { key } = ctx;

      const inputPayload =
        "reqPayload" in input
          ? chatCompletionInputReqPayload.parse(input.reqPayload)
          : chatCompletionInputReqPayload.parse(input);

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
        const completion = await getCompletion2(fineTune, inputPayload);
        const inputTokens = completion.usage?.prompt_tokens ?? 0;
        const outputTokens = completion.usage?.completion_tokens ?? 0;
        const cost = calculateFineTuneUsageCost({
          inputTokens,
          outputTokens,
          baseModel: fineTune.baseModel,
        });

        // Don't `await` this to minimize latency
        prisma.usageLog
          .create({
            data: {
              fineTuneId: fineTune.id,
              type: UsageType.EXTERNAL,
              inputTokens,
              outputTokens,
              cost,
            },
          })
          .catch((error) => captureException(error));

        posthogServerClient?.capture({
          distinctId: fineTune.projectId,
          event: "fine-tune-usage",
          properties: {
            model: inputPayload.model,
            inputTokens,
            outputTokens,
            cost,
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

      const newLoggedCallId = uuidv4();

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
            fineTune?.baseModel,
          );
        } else {
          usage = openaAIModelProvider.getUsage(
            input.reqPayload as ChatCompletionCreateParams,
            respPayload.success ? (input.respPayload as ChatCompletion) : undefined,
          );
        }
      }

      try {
        await prisma.loggedCall.create({
          data: {
            id: newLoggedCallId,
            projectId: ctx.key.projectId,
            requestedAt: new Date(input.requestedAt),
            model,
            receivedAt: new Date(input.receivedAt),
            reqPayload: (input.reqPayload === null
              ? Prisma.JsonNull
              : input.reqPayload) as Prisma.InputJsonValue,
            respPayload: (input.respPayload === null
              ? Prisma.JsonNull
              : input.respPayload) as Prisma.InputJsonValue,
            statusCode: input.statusCode,
            errorMessage: input.errorMessage,
            durationMs: input.receivedAt - input.requestedAt,
            inputTokens: usage?.inputTokens,
            outputTokens: usage?.outputTokens,
            cost: usage?.cost,
            completionId: respPayload.success ? respPayload.data.id : null,
          },
        });
      } catch (e) {
        throw new TRPCError({
          message: `Failed to create logged call: ${(e as Error).message}`,
          code: "BAD_REQUEST",
        });
      }

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
          statusCode: z.number().nullable(),
          errorMessage: z.string().nullable(),
          reqPayload: z.unknown(),
          respPayload: z.unknown(),
          tags: z.record(z.string().nullable()),
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
          tags: true,
          id: true,
          statusCode: true,
          errorMessage: true,
          reqPayload: true,
          respPayload: true,
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
