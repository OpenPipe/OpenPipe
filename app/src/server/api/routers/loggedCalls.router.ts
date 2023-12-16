import { z } from "zod";
import { jsonArrayFrom } from "kysely/helpers/postgres";
import { WritableStreamBuffer } from "stream-buffers";
import type { ChatCompletionCreateParamsBase } from "openai/resources/chat/completions";
import type { JsonValue } from "type-fest";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { kysely } from "~/server/db";
import { requireCanViewProject } from "~/utils/accessControl";
import hashObject from "~/server/utils/hashObject";
import { constructLoggedCallFiltersQuery } from "~/server/utils/constructLoggedCallFiltersQuery";
import { LOGGED_CALL_EXPORT_FORMATS, filtersSchema } from "~/types/shared.types";
import { typedLoggedCall } from "~/types/dbColumns.types";
import {
  convertToolCallInputToFunctionInput,
  convertToolCallMessageToFunction,
} from "~/server/utils/convertFunctionCalls";

export const loggedCallsRouter = createTRPCRouter({
  list: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        page: z.number(),
        pageSize: z.number(),
        filters: filtersSchema,
      }),
    )
    .query(async ({ input, ctx }) => {
      const { projectId, page, pageSize } = input;

      await requireCanViewProject(projectId, ctx);

      const baseQuery = constructLoggedCallFiltersQuery(input.filters, projectId);

      const rawCalls = await baseQuery
        .select((eb) => [
          "lc.id as id",
          "lc.requestedAt as requestedAt",
          "model",
          "lc.requestedAt",
          "lc.receivedAt",
          "lc.reqPayload",
          "lc.respPayload",
          "lc.model",
          "lc.inputTokens",
          "lc.outputTokens",
          "lc.cost",
          "lc.statusCode",
          "lc.durationMs",
          jsonArrayFrom(
            eb
              .selectFrom("LoggedCallTag")
              .select(["name", "value"])
              .whereRef("loggedCallId", "=", "lc.id"),
          ).as("tags"),
        ])
        .orderBy("lc.requestedAt", "desc")
        .limit(pageSize)
        .offset((page - 1) * pageSize)
        .execute();

      const calls = rawCalls.map((rawCall) => {
        const tagsObject = rawCall.tags.reduce(
          (acc, tag) => {
            acc[tag.name] = tag.value;
            return acc;
          },
          {} as Record<string, string | null>,
        );

        return {
          id: rawCall.id,
          requestedAt: rawCall.requestedAt,
          receivedAt: rawCall.receivedAt,
          reqPayload: rawCall.reqPayload,
          respPayload: rawCall.respPayload,
          inputTokens: rawCall.inputTokens,
          outputTokens: rawCall.outputTokens,
          cost: rawCall.cost,
          statusCode: rawCall.statusCode,
          durationMs: rawCall.durationMs,
          model: rawCall.model,
          tags: tagsObject,
        };
      });

      const count = (
        await baseQuery
          .select(({ fn }) => [fn.count("lc.id").as("match_count")])
          .executeTakeFirstOrThrow()
      )?.match_count;

      return { calls, count: Number(count) };
    }),
  getTagNames: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ input, ctx }) => {
      await requireCanViewProject(input.projectId, ctx);

      const tags = await kysely
        .selectFrom("LoggedCallTag")
        .select("name")
        .distinct()
        .where("projectId", "=", input.projectId)
        .orderBy("name")
        .execute();

      return tags.map((tag) => tag.name);
    }),
  export: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        filters: filtersSchema,
        defaultToSelected: z.boolean(),
        selectedLogIds: z.string().array(),
        deselectedLogIds: z.string().array(),
        selectedExportFormat: z.enum(LOGGED_CALL_EXPORT_FORMATS),
        removeDuplicates: z.boolean(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      await requireCanViewProject(input.projectId, ctx);

      const baseQuery = constructLoggedCallFiltersQuery(input.filters, input.projectId, {
        defaultToSelected: input.defaultToSelected,
        selectedLogIds: input.selectedLogIds,
        deselectedLogIds: input.deselectedLogIds,
        // Unless the user is exporting raw data, we don't want to export unsuccessful calls
        removeUnsuccessful: input.selectedExportFormat !== "Raw",
      });

      const loggedCallsFromDb = await baseQuery
        .select((eb) => [
          "lc.reqPayload",
          "lc.respPayload",
          jsonArrayFrom(
            eb
              .selectFrom("LoggedCallTag")
              .select(["name", "value"])
              .whereRef("loggedCallId", "=", "lc.id"),
          ).as("tags"),
        ])
        .orderBy("lc.requestedAt", "desc")
        .execute();

      let formattedLoggedCalls: (
        | {
            input: JsonValue;
            output: JsonValue;
            tags: Record<string, string | null>;
          }
        | {
            messages: ChatCompletionCreateParamsBase["messages"];
            function_call: ChatCompletionCreateParamsBase["function_call"];
            functions: ChatCompletionCreateParamsBase["functions"];
          }
      )[] = [];

      if (input.selectedExportFormat === "Raw") {
        formattedLoggedCalls = loggedCallsFromDb.map((loggedCall) => {
          const tagsObject = loggedCall.tags.reduce(
            (acc, tag) => {
              acc[tag.name] = tag.value;
              return acc;
            },
            {} as Record<string, string | null>,
          );

          return {
            input: loggedCall.reqPayload as JsonValue,
            output: loggedCall.respPayload as JsonValue,
            tags: tagsObject,
          };
        });
      } else {
        loggedCallsFromDb.forEach((loggedCall) => {
          if (!loggedCall.reqPayload) return;
          try {
            const typedCall = typedLoggedCall(loggedCall);
            const input = convertToolCallInputToFunctionInput(typedCall.reqPayload);
            const outputMessage = typedCall.respPayload?.choices?.[0]?.message;
            if (!outputMessage) return;
            formattedLoggedCalls.push({
              messages: [...input.messages, convertToolCallMessageToFunction(outputMessage)],
              function_call: input.function_call,
              functions: input.functions,
            });
          } catch {
            // pass
          }
        });
      }

      if (input.removeDuplicates) {
        const deduplicatedLoggedCalls = [];
        const loggedCallHashSet = new Set<string>();
        for (const loggedCall of formattedLoggedCalls) {
          const loggedCallHash = hashObject(loggedCall as JsonValue);
          if (!loggedCallHashSet.has(loggedCallHash)) {
            loggedCallHashSet.add(loggedCallHash);
            deduplicatedLoggedCalls.push(loggedCall);
          }
        }
        formattedLoggedCalls = deduplicatedLoggedCalls;
      }

      // Convert arrays to JSONL format
      const jsonl = formattedLoggedCalls.map((item) => JSON.stringify(item)).join("\n");

      const output = new WritableStreamBuffer();
      output.write(jsonl);
      output.end();

      await new Promise((resolve) => output.on("finish", resolve));

      // Convert buffer to base64
      const base64 = output.getContents().toString("base64");

      return base64;
    }),
});
