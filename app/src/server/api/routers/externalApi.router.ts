import { type Prisma } from "@prisma/client";
import { type JsonValue } from "type-fest";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import { TRPCError } from "@trpc/server";

import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { prisma } from "~/server/db";
import { hashRequest } from "~/server/utils/hashObject";
import modelProvider from "~/modelProviders/openai-ChatCompletion";
import {
  type ChatCompletion,
  type CompletionCreateParams,
} from "openai/resources/chat/completions";

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

export const externalApiRouter = createTRPCRouter({
  checkCache: publicProcedure
    .meta({
      openapi: {
        method: "POST",
        path: "/v1/check-cache",
        description: "Check if a prompt is cached",
      },
    })
    .input(
      z.object({
        startTime: z.number().describe("Unix timestamp in milliseconds"),
        reqPayload: z.unknown().describe("JSON-encoded request payload"),
        tags: z
          .record(z.string())
          .optional()
          .describe(
            'Extra tags to attach to the call for filtering. Eg { "userId": "123", "promptId": "populate-title" }',
          ),
      }),
    )
    .output(
      z.object({
        respPayload: z.unknown().optional().describe("JSON-encoded response payload"),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const apiKey = ctx.apiKey;
      if (!apiKey) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }
      const key = await prisma.apiKey.findUnique({
        where: { apiKey },
      });
      if (!key) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }
      const reqPayload = await reqValidator.spa(input.reqPayload);
      const cacheKey = hashRequest(key.projectId, reqPayload as JsonValue);

      const existingResponse = await prisma.loggedCallModelResponse.findFirst({
        where: {
          cacheKey,
        },
        include: {
          originalLoggedCall: true,
        },
        orderBy: {
          requestedAt: "desc",
        },
      });

      if (!existingResponse) return { respPayload: null };

      await prisma.loggedCall.create({
        data: {
          projectId: key.projectId,
          requestedAt: new Date(input.startTime),
          cacheHit: true,
          modelResponseId: existingResponse.id,
        },
      });

      return {
        respPayload: existingResponse.respPayload,
      };
    }),

  report: publicProcedure
    .meta({
      openapi: {
        method: "POST",
        path: "/v1/report",
        description: "Report an API call",
      },
    })
    .input(
      z.object({
        startTime: z.number().describe("Unix timestamp in milliseconds"),
        endTime: z.number().describe("Unix timestamp in milliseconds"),
        reqPayload: z.unknown().describe("JSON-encoded request payload"),
        respPayload: z.unknown().optional().describe("JSON-encoded response payload"),
        respStatus: z.number().optional().describe("HTTP status code of response"),
        error: z.string().optional().describe("User-friendly error message"),
        tags: z
          .record(z.string())
          .optional()
          .describe(
            'Extra tags to attach to the call for filtering. Eg { "userId": "123", "promptId": "populate-title" }',
          ),
      }),
    )
    .output(z.void())
    .mutation(async ({ input, ctx }) => {
      const apiKey = ctx.apiKey;
      if (!apiKey) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }
      const key = await prisma.apiKey.findUnique({
        where: { apiKey },
      });
      if (!key) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }
      const reqPayload = await reqValidator.spa(input.reqPayload);
      const respPayload = await respValidator.spa(input.respPayload);

      const requestHash = hashRequest(key.projectId, reqPayload as JsonValue);

      const newLoggedCallId = uuidv4();
      const newModelResponseId = uuidv4();

      let usage;
      if (reqPayload.success && respPayload.success) {
        usage = modelProvider.getUsage(
          input.reqPayload as CompletionCreateParams,
          input.respPayload as ChatCompletion,
        );
      }

      await prisma.$transaction([
        prisma.loggedCall.create({
          data: {
            id: newLoggedCallId,
            projectId: key.projectId,
            requestedAt: new Date(input.startTime),
            cacheHit: false,
          },
        }),
        prisma.loggedCallModelResponse.create({
          data: {
            id: newModelResponseId,
            originalLoggedCallId: newLoggedCallId,
            requestedAt: new Date(input.startTime),
            receivedAt: new Date(input.endTime),
            reqPayload: input.reqPayload as Prisma.InputJsonValue,
            respPayload: input.respPayload as Prisma.InputJsonValue,
            statusCode: input.respStatus,
            errorMessage: input.error,
            durationMs: input.endTime - input.startTime,
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

      const tagsToCreate = Object.entries(input.tags ?? {}).map(([name, value]) => ({
        loggedCallId: newLoggedCallId,
        // sanitize tags
        name: name.replaceAll(/[^a-zA-Z0-9_]/g, "_"),
        value,
      }));

      if (reqPayload.success) {
        tagsToCreate.push({
          loggedCallId: newLoggedCallId,
          name: "$model",
          value: reqPayload.data.model,
        });
      }
      await prisma.loggedCallTag.createMany({
        data: tagsToCreate,
      });
    }),
});
