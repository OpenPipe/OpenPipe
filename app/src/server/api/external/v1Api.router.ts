import { type Prisma } from "@prisma/client";
import { type JsonValue } from "type-fest";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import { prisma } from "~/server/db";
import { hashRequest } from "~/server/utils/hashObject";
import modelProvider from "~/modelProviders/openai-ChatCompletion";
import {
  type ChatCompletion,
  type CompletionCreateParams,
} from "openai/resources/chat/completions";
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
        description: "Check if a prompt is cached",
        protect: true,
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

      await prisma.loggedCall.create({
        data: {
          projectId: ctx.key.projectId,
          requestedAt: new Date(input.requestedAt),
          cacheHit: true,
          modelResponseId: existingResponse.id,
        },
      });

      await createTags(
        existingResponse.originalLoggedCall.projectId,
        existingResponse.originalLoggedCallId,
        input.tags,
      );
      return {
        respPayload: existingResponse.respPayload,
      };
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
    .output(z.object({ status: z.literal("ok") }))
    .mutation(async ({ input, ctx }) => {
      const reqPayload = await reqValidator.spa(input.reqPayload);
      const respPayload = await respValidator.spa(input.respPayload);

      const requestHash = hashRequest(ctx.key.projectId, reqPayload as JsonValue);

      const newLoggedCallId = uuidv4();
      const newModelResponseId = uuidv4();

      let usage;
      let model;
      if (reqPayload.success && respPayload.success) {
        usage = modelProvider.getUsage(
          input.reqPayload as CompletionCreateParams,
          input.respPayload as ChatCompletion,
        );
        model = reqPayload.data.model;
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
    name: name.replaceAll(/[^a-zA-Z0-9_$]/g, "_"),
    value,
  }));
  await prisma.loggedCallTag.createMany({
    data: tagsToCreate,
  });
}
