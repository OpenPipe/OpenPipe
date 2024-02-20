import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { prisma } from "~/server/db";
import { parseTags } from "~/server/utils/parseTags";
import { chatCompletionOutput } from "~/types/shared.types";
import {
  calculateUsage,
  recordLoggedCall,
  reqValidator,
  type CalculatedUsage,
} from "~/utils/recordRequest";
import { openApiProtectedProc } from "../../openApiTrpc";
import { requireWriteKey } from "../helpers";

export const report = openApiProtectedProc
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
      requestedAt: z.number().optional().describe("Unix timestamp in milliseconds"),
      receivedAt: z.number().optional().describe("Unix timestamp in milliseconds"),
      reqPayload: z.unknown().describe("JSON-encoded request payload"),
      respPayload: z.unknown().optional().describe("JSON-encoded response payload"),
      statusCode: z.number().optional().describe("HTTP status code of response"),
      errorMessage: z.string().optional().describe("User-friendly error message"),
      tags: z
        .record(z.union([z.string(), z.number(), z.boolean(), z.null()]))
        .optional()
        .describe(
          'Extra tags to attach to the call for filtering. Eg { "userId": "123", "promptId": "populate-title" }',
        )
        .default({}),
    }),
  )
  .output(z.object({ status: z.union([z.literal("ok"), z.literal("error")]) }))
  .mutation(async ({ input, ctx }) => {
    await requireWriteKey(ctx);

    // Zod default messes up the generated OpenAPI spec, so we do it manually
    if (!input.requestedAt) input.requestedAt = Date.now();

    const reqPayload = await reqValidator.spa(input.reqPayload);
    const respPayload = await chatCompletionOutput.spa(input.respPayload);

    let usage: CalculatedUsage | undefined;

    if (reqPayload.success && respPayload.success) {
      const fineTune = await prisma.fineTune.findUnique({
        where: { slug: reqPayload.data.model.replace("openpipe:", "") },
      });

      usage = calculateUsage({
        inputPayload: reqPayload.data,
        completion: respPayload.data,
        fineTune: fineTune ?? undefined,
      });
    }

    let tags: Record<string, string> = {};
    try {
      tags = parseTags(input.tags);
    } catch (e) {
      throw new TRPCError({
        message: `Failed to parse tags: ${(e as Error).message}`,
        code: "BAD_REQUEST",
      });
    }

    try {
      await recordLoggedCall({
        projectId: ctx.key.projectId,
        usage,
        requestedAt: input.requestedAt,
        receivedAt: input.receivedAt,
        cacheHit: false,
        reqPayload: input.reqPayload,
        respPayload: input.respPayload,
        statusCode: input.statusCode,
        errorMessage: input.errorMessage,
        tags,
      });
    } catch (e) {
      throw new TRPCError({
        message: `Failed to create logged call: ${(e as Error).message}`,
        code: "BAD_REQUEST",
      });
    }

    return { status: "ok" };
  });
