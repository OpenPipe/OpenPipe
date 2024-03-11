import type { CachedResponse } from "@prisma/client";
import { captureException } from "@sentry/node";
import { TRPCError } from "@trpc/server";
import { APIError } from "openai";
import { type ChatCompletion, type ChatCompletionChunk } from "openai/resources/chat";
import { Stream } from "openai/streaming";
import { ExtendedTRPCError } from "trpc-openapi";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";

import { getCompletion } from "~/modelProviders/fine-tuned/getCompletion";
import { kysely, prisma } from "~/server/db";
import { hashRequest } from "~/server/utils/hashObject";
import { getOpenaiCompletion } from "~/server/utils/openai";
import { parseTags } from "~/server/utils/parseTags";
import { statusCodeFromTrpcCode, trpcCodeFromHttpStatus } from "~/server/utils/trpcStatusCodes";
import { typedFineTune } from "~/types/dbColumns.types";
import {
  chatCompletionInputReqPayload,
  chatCompletionOutput,
  chatMessage,
  functionCallInput,
  functionsInput,
  toolChoiceInput,
  toolsInput,
} from "~/types/shared.types";
import { recordLoggedCall, recordUsage } from "~/utils/recordRequest";
import { openApiProtectedProc } from "../../openApiTrpc";
import {
  recordOngoingRequestEnd,
  recordOngoingRequestStart,
} from "~/utils/rateLimit/concurrencyRateLimits";
import { type TRPC_ERROR_CODE_KEY } from "@trpc/server/rpc";

export const createChatCompletion = openApiProtectedProc
  .meta({
    openapi: {
      method: "POST",
      path: "/chat/completions",
      description:
        "OpenAI-compatible route for generating inference and optionally logging the request.",
      protect: true,
    },
  })
  .input(
    // TODO: replace this whole mess with just `chatCompletionInputReqPayload`
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
      stream: z.boolean().default(false),
      response_format: z
        .object({
          type: z.union([z.literal("text"), z.literal("json_object")]).optional(),
        })
        .optional(),
    }),
  )
  .output(z.union([chatCompletionOutput.nullable(), z.any()]))
  .mutation(async ({ input, ctx }): Promise<ChatCompletion | ReadableStream> => {
    const { key } = ctx;
    let ongoingRequestId: string | undefined = undefined;
    let tags: Record<string, string> = {};
    let logRequest = true;

    const requestedAt = Date.now();

    const inputPayload =
      "reqPayload" in input
        ? chatCompletionInputReqPayload.parse(input.reqPayload)
        : chatCompletionInputReqPayload.parse(input);

    try {
      if ("reqPayload" in input) {
        captureException(
          new Error(
            `reqPayload should not be present in input. model: ${input.model ?? ""} project: ${
              key.projectId
            }`,
          ),
        );
      }

      const isFineTune = inputPayload.model.startsWith("openpipe:");

      // Default to true if not using a fine-tuned model
      logRequest =
        (ctx.headers["op-log-request"] === "true" || !isFineTune) &&
        ctx.headers["op-log-request"] !== "false" &&
        !ctx.key.readOnly;

      ongoingRequestId = await recordOngoingRequestStart(key.projectId, isFineTune);

      if (ctx.headers["op-tags"]) {
        try {
          const jsonTags = JSON.parse(ctx.headers["op-tags"] as string);
          tags = parseTags(jsonTags);
        } catch (error: unknown) {
          throw new TRPCError({
            message: `Failed to parse tags: ${(error as Error).message}`,
            code: "BAD_REQUEST",
          });
        }
      }

      const modelSlug = inputPayload.model.replace("openpipe:", "");
      const fineTune =
        (await prisma.fineTune.findUnique({
          where: { slug: modelSlug },
        })) ?? undefined;

      // Default to skipping cache if not explicitly set
      const useCache = ctx.headers["op-cache"] === "true";

      if (useCache && inputPayload.stream) {
        throw new TRPCError({
          message: "Cannot use cache with stream",
          code: "BAD_REQUEST",
        });
      }

      const modelId = fineTune?.id ?? inputPayload.model;
      const cacheKey = hashRequest(modelId, inputPayload);
      let cachedCompletion: CachedResponse | null = null;
      if (useCache) {
        cachedCompletion = await prisma.cachedResponse.findUnique({
          where: { projectId_cacheKey: { projectId: key.projectId, cacheKey } },
        });
      }

      let completion: ChatCompletion | Stream<ChatCompletionChunk>;

      if (cachedCompletion) {
        completion = chatCompletionOutput.parse(cachedCompletion?.respPayload);
        completion.usage = {
          prompt_tokens: cachedCompletion.inputTokens,
          completion_tokens: cachedCompletion.outputTokens,
          total_tokens: cachedCompletion.inputTokens + cachedCompletion.outputTokens,
        };
      } else if (isFineTune) {
        if (!fineTune) {
          throw new TRPCError({
            message: `The model \`${inputPayload.model}\` does not exist`,
            code: "NOT_FOUND",
          });
        }

        const typedFT = typedFineTune(fineTune);

        if (typedFT && typedFT.projectId !== key.projectId) {
          throw new TRPCError({
            message: "The model does not belong to this project",
            code: "FORBIDDEN",
          });
        }

        try {
          completion = await getCompletion(typedFT, inputPayload);
        } catch (error: unknown) {
          console.error(error);
          throw new TRPCError({
            message: `Failed to get fine-tune completion: ${(error as Error).message}`,
            code: "BAD_REQUEST",
          });
        }
      } else {
        if (key.readOnly) {
          throw new TRPCError({
            message: "Read-only OpenPipe API keys cannot access the base OpenAI API",
            code: "FORBIDDEN",
          });
        }
        try {
          completion = await getOpenaiCompletion(key.projectId, {
            ...inputPayload,
            stream: input.stream,
          });
        } catch (error: unknown) {
          if (error instanceof APIError) {
            // Pass through OpenAI API errors
            throw new TRPCError({
              message: error.message,
              code: trpcCodeFromHttpStatus(error.status),
            });
          }
          throw new TRPCError({
            message: `Failed to get OpenAI completion: ${(error as Error).message}`,
            code: "BAD_REQUEST",
            cause: error as Error,
          });
        }
      }

      if (completion instanceof Stream) {
        // split stream to avoid locking the read mutex
        const [recordStream, outputStream] = completion.tee();
        void recordUsage({
          projectId: key.projectId,
          requestedAt,
          receivedAt: Date.now(),
          cacheHit: !!cachedCompletion,
          inputPayload,
          completion: recordStream,
          logRequest,
          fineTune,
          tags,
          ongoingRequestId,
        }).catch((e) => captureException(e));

        return outputStream.toReadableStream();
      } else {
        void recordUsage({
          projectId: key.projectId,
          requestedAt,
          receivedAt: Date.now(),
          cacheHit: !!cachedCompletion,
          inputPayload,
          completion,
          logRequest,
          fineTune,
          tags,
          ongoingRequestId,
        }).catch((e) => captureException(e));
        if (useCache && !cachedCompletion) {
          void kysely
            .insertInto("CachedResponse")
            .values({
              id: uuidv4(),
              cacheKey,
              modelId,
              completionId: completion.id,
              respPayload: JSON.stringify(completion),
              projectId: key.projectId,
              inputTokens: completion.usage?.prompt_tokens ?? 0,
              outputTokens: completion.usage?.completion_tokens ?? 0,
            })
            .onConflict((oc) => oc.columns(["cacheKey", "projectId"]).doNothing())
            .execute()
            .catch((e) => captureException(e));
        }

        return completion;
      }
    } catch (error: unknown) {
      void recordOngoingRequestEnd(ongoingRequestId);

      const { status, code, message } = extractErrorDetails(error);

      if (logRequest) {
        // record error in request log
        void recordLoggedCall({
          projectId: key.projectId,
          requestedAt,
          receivedAt: Date.now(),
          cacheHit: false,
          reqPayload: inputPayload,
          respPayload: {
            code,
            message,
          },
          statusCode: status,
          errorMessage: message,
          tags,
        });
      }

      throw new ExtendedTRPCError({
        code,
        message,
        extraFields: {
          // Add error field for compatibility with the OpenAI TypeScript client
          error: {
            code,
            message,
          },
        },
      });
    }
  });

function extractErrorDetails(error: unknown): {
  status: number;
  code: TRPC_ERROR_CODE_KEY;
  message: string;
} {
  let status = 500;
  let code: TRPC_ERROR_CODE_KEY = "BAD_REQUEST";
  let message = "Error processing request";

  const expectedErrors = [429];

  if (error instanceof TRPCError) {
    status = statusCodeFromTrpcCode(error.code);
    code = error.code;
    message = error.message;
  } else if (error instanceof Error) {
    const err = error as any;
    if (
      "status" in err &&
      typeof err.status === "number" &&
      expectedErrors.includes(err.status as number)
    ) {
      status = err.status;
      code = trpcCodeFromHttpStatus(status);
      message = err.message;
    } else {
      throw error;
    }
  }

  return { status, code, message };
}
