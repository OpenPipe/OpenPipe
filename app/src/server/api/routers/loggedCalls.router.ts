import { z } from "zod";
import { jsonArrayFrom } from "kysely/helpers/postgres";
import { WritableStreamBuffer } from "stream-buffers";
import type { JsonValue } from "type-fest";
import { sql } from "kysely";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { requireCanViewProject } from "~/utils/accessControl";
import hashObject from "~/server/utils/hashObject";
import { constructLoggedCallFiltersQuery } from "~/server/utils/constructLoggedCallFiltersQuery";
import { filtersSchema } from "~/types/shared.types";

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
      const { projectId, page, pageSize, filters } = input;

      await requireCanViewProject(projectId, ctx);

      const rawCalls = await constructLoggedCallFiltersQuery({ filters, projectId })
        .select((eb) => [
          "lc.id as id",
          "lc.requestedAt as requestedAt",
          "model",
          "lc.requestedAt",
          "lc.receivedAt",
          "lc.cacheHit",
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
          cacheHit: rawCall.cacheHit,
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

      return { calls };
    }),
  getMatchingCount: protectedProcedure
    .input(z.object({ projectId: z.string(), filters: filtersSchema }))
    .query(async ({ input, ctx }) => {
      const { projectId, filters } = input;

      await requireCanViewProject(projectId, ctx);

      const count = await constructLoggedCallFiltersQuery({ filters, projectId })
        .select(sql<number>`count(*)::int`.as("matchCount"))
        .executeTakeFirstOrThrow()
        .then((result) => result.matchCount);

      return { count };
    }),
  export: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        filters: filtersSchema,
        defaultToSelected: z.boolean(),
        selectedLogIds: z.string().array(),
        deselectedLogIds: z.string().array(),
        removeDuplicates: z.boolean(),
        excludeErrors: z.boolean(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      await requireCanViewProject(input.projectId, ctx);

      const baseQuery = constructLoggedCallFiltersQuery({
        filters: input.filters,
        projectId: input.projectId,
        selectionParams: {
          defaultToSelected: input.defaultToSelected,
          selectedLogIds: input.selectedLogIds,
          deselectedLogIds: input.deselectedLogIds,
          removeUnsuccessful: input.excludeErrors,
        },
      });

      const loggedCallsFromDb = await baseQuery
        .select((eb) => [
          "lc.reqPayload",
          "lc.respPayload",
          "lc.cacheHit",
          "lc.durationMs",
          jsonArrayFrom(
            eb
              .selectFrom("LoggedCallTag")
              .select(["name", "value"])
              .whereRef("loggedCallId", "=", "lc.id"),
          ).as("tags"),
        ])
        .orderBy("lc.requestedAt", "desc")
        .execute();

      let formattedLoggedCalls = loggedCallsFromDb.map((loggedCall) => {
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
          cacheHit: loggedCall.cacheHit,
          durationMs: loggedCall.durationMs,
          tags: tagsObject,
        };
      });

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
