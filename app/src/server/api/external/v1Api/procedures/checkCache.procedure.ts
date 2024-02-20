import { captureException } from "@sentry/browser";
import { z } from "zod";
import { chatCompletionInputReqPayload } from "~/types/shared.types";
import { openApiProtectedProc } from "../../openApiTrpc";

export const checkCache = openApiProtectedProc
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
    let model = "";
    try {
      const reqPayload = chatCompletionInputReqPayload.parse(input.reqPayload);
      model = reqPayload.model;
    } catch {
      // pass
    }
    captureException(new Error(`checkCache was called: ${model} project: ${ctx.key.projectId}`));

    // Return null
    return { respPayload: null };
  });
