import { TRPCError } from "@trpc/server";
import { type ChatCompletionChunk, type ChatCompletion } from "openai/resources/chat";
import { Stream } from "openai/streaming";
import { APIError } from "openai";
import { z } from "zod";
import { captureException } from "@sentry/node";
import { ExtendedTRPCError } from "trpc-openapi";
import { v4 as uuidv4 } from "uuid";
import type { CachedResponse } from "@prisma/client";

import { getCompletion } from "~/modelProviders/fine-tuned/getCompletion";
import { kysely, prisma } from "~/server/db";
import {
  chatCompletionInputReqPayload,
  chatCompletionOutput,
  chatMessage,
  functionCallInput,
  functionsInput,
  toolChoiceInput,
  toolsInput,
  type filtersSchema,
} from "~/types/shared.types";
import { createOpenApiRouter, openApiProtectedProc } from "./openApiTrpc";
import { typedFineTune } from "~/types/dbColumns.types";
import {
  type CalculatedUsage,
  calculateUsage,
  recordLoggedCall,
  recordUsage,
  reqValidator,
} from "~/utils/recordRequest";
import { getOpenaiCompletion } from "~/server/utils/openai";
import { parseTags } from "~/server/utils/parseTags";
import { statusCodeFromTrpcCode, trpcCodeFromHttpStatus } from "~/server/utils/trpcStatusCodes";
import { constructLoggedCallFiltersQuery } from "~/server/utils/constructLoggedCallFiltersQuery";
import { sql } from "kysely";
import { hashRequest } from "~/server/utils/hashObject";
import { queueRelabelLoggedCalls } from "~/server/tasks/relabelLoggedCall.task";

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
    }),
  createChatCompletion: openApiProtectedProc
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

      const inputPayload =
        "reqPayload" in input
          ? chatCompletionInputReqPayload.parse(input.reqPayload)
          : chatCompletionInputReqPayload.parse(input);

      if ("reqPayload" in input) {
        captureException(
          new Error(
            `reqPayload should not be present in input. model: ${input.model ?? ""} project: ${
              key.projectId
            }`,
          ),
        );
      }

      const requestedAt = Date.now();

      const isFineTune = inputPayload.model.startsWith("openpipe:");

      // Default to true if not using a fine-tuned model
      const logRequest =
        (ctx.headers["op-log-request"] === "true" || !isFineTune) &&
        ctx.headers["op-log-request"] !== "false" &&
        !ctx.key.readOnly;

      let tags: Record<string, string> = {};

      try {
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
        if (error instanceof TRPCError) {
          const statusCode = statusCodeFromTrpcCode(error.code);
          if (logRequest) {
            // record error in request log
            void recordLoggedCall({
              projectId: key.projectId,
              requestedAt,
              receivedAt: Date.now(),
              cacheHit: false,
              reqPayload: inputPayload,
              respPayload: {
                code: error.code,
                message: error.message,
              },
              statusCode,
              errorMessage: error.message,
              tags,
            });
          }
          throw new ExtendedTRPCError({
            code: error.code,
            message: error.message,
            extraFields: {
              // Add error field for compatibility with the OpenAI TypeScript client
              error: {
                code: statusCode,
                message: error.message,
              },
            },
          });
        }
        throw error;
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
      if (ctx.key.readOnly) {
        throw new TRPCError({
          message: "Read-only API keys cannot report API calls",
          code: "FORBIDDEN",
        });
      }
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
    }),
  updateLogTags: openApiProtectedProc
    .meta({
      openapi: {
        method: "POST",
        path: "/logs/update-tags",
        description: "Update tags for logged calls matching the provided filters",
        protect: true,
      },
    })
    .input(
      z.object({
        filters: z
          .object({
            field: z
              .string()
              .describe(
                "The field to filter on. Possible fields include: `model`, `completionId`, and `tags.your_tag_name`.",
              ),
            equals: z.union([z.string(), z.number(), z.boolean()]),
          })
          .array(),
        tags: z
          .record(z.union([z.string(), z.number(), z.boolean(), z.null()]))
          .describe(
            'Extra tags to attach to the call for filtering. Eg { "userId": "123", "promptId": "populate-title" }',
          ),
      }),
    )
    .output(z.object({ matchedLogs: z.number() }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.key.readOnly) {
        throw new TRPCError({
          message: "Read-only API keys cannot update log tags",
          code: "FORBIDDEN",
        });
      }

      let tags: Record<string, string | null> = {};
      try {
        tags = parseTags(input.tags, true);
      } catch (e) {
        throw new TRPCError({
          message: `Failed to parse tags: ${(e as Error).message}`,
          code: "BAD_REQUEST",
        });
      }

      const tagNamesToDelete = Object.keys(tags).filter((key) => tags[key] === null);
      const tagsToUpsert = Object.entries(tags).filter(([, value]) => value !== null) as [
        string,
        string,
      ][];

      const filters: z.infer<typeof filtersSchema> = [];

      for (const filter of input.filters) {
        filters.push({
          field: filter.field,
          comparator: "=",
          value: filter.equals.toString(),
        });
      }

      const matchedLogs = await constructLoggedCallFiltersQuery({
        filters,
        projectId: ctx.key.projectId,
      })
        .select(sql<number>`count(*)::int`.as("count"))
        .executeTakeFirst();

      if (tagNamesToDelete.length > 0) {
        await kysely
          .deleteFrom("LoggedCallTag")
          .using((eb) =>
            constructLoggedCallFiltersQuery({
              filters,
              projectId: ctx.key.projectId,
              lctEB: eb,
            })
              .select("lc.id")
              .as("lc"),
          )
          .whereRef("LoggedCallTag.loggedCallId", "=", "lc.id")
          .where("LoggedCallTag.name", "in", tagNamesToDelete)
          .execute();
      }

      const loggedCallIds = await constructLoggedCallFiltersQuery({
        filters,
        projectId: ctx.key.projectId,
      })
        .select("lc.id")
        .execute()
        .then((rows) => rows.map((row) => row.id));

      const dataToInsert: {
        id: string;
        name: string;
        value: string;
        projectId: string;
        loggedCallId: string;
      }[] = [];

      // Iterate over each logged call and insert tags
      for (const loggedCallId of loggedCallIds) {
        // Prepare the insert data for each tag
        dataToInsert.push(
          ...tagsToUpsert.map(([name, value]) => ({
            id: uuidv4(),
            name,
            value,
            projectId: ctx.key.projectId,
            loggedCallId,
          })),
        );
      }

      if (dataToInsert.length) {
        await kysely
          .insertInto("LoggedCallTag")
          .columns(["name", "value", "projectId", "loggedCallId"])
          .values(dataToInsert)
          .onConflict((oc) =>
            oc.columns(["loggedCallId", "name"]).doUpdateSet((eb) => ({
              value: eb.ref("excluded.value"),
            })),
          )
          .execute();
      }

      if (tags["relabel"] === "true" && tags["add_to_dataset"] === "original_model_dataset") {
        await queueRelabelLoggedCalls({
          projectId: ctx.key.projectId,
          loggedCallIds,
        });
      }

      return { matchedLogs: matchedLogs?.count ?? 0 };
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
          cacheHit: true,
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
