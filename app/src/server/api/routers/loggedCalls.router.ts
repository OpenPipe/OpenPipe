import { z } from "zod";
import { jsonArrayFrom } from "kysely/helpers/postgres";
import archiver from "archiver";
import { WritableStreamBuffer } from "stream-buffers";
import { type JsonValue } from "type-fest";
import { shuffle } from "lodash-es";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { kysely } from "~/server/db";
import { requireCanViewProject } from "~/utils/accessControl";
import hashObject from "~/server/utils/hashObject";
import { constructFiltersQuery, logFiltersSchema } from "~/server/utils/constructFiltersQuery";

export const loggedCallsRouter = createTRPCRouter({
  list: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        page: z.number(),
        pageSize: z.number(),
        filters: logFiltersSchema,
      }),
    )
    .query(async ({ input, ctx }) => {
      const { projectId, page, pageSize } = input;

      await requireCanViewProject(projectId, ctx);

      const baseQuery = constructFiltersQuery(input.filters, projectId);

      const rawCalls = await baseQuery
        .select((eb) => [
          "lc.id as id",
          "lc.requestedAt as requestedAt",
          "model",
          "cacheHit",
          "lc.requestedAt",
          "receivedAt",
          "reqPayload",
          "respPayload",
          "model",
          "inputTokens",
          "outputTokens",
          "cost",
          "statusCode",
          "durationMs",
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
          model: rawCall.model,
          cacheHit: rawCall.cacheHit,
          modelResponse: {
            receivedAt: rawCall.receivedAt,
            reqPayload: rawCall.reqPayload,
            respPayload: rawCall.respPayload,
            inputTokens: rawCall.inputTokens,
            outputTokens: rawCall.outputTokens,
            cost: rawCall.cost,
            statusCode: rawCall.statusCode,
            durationMs: rawCall.durationMs,
          },
          tags: tagsObject,
        };
      });

      const matchingLogIds = await baseQuery.select(["lc.id"]).execute();

      const count = matchingLogIds.length;

      return { calls, count };
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
        loggedCallIds: z.string().array(),
        testingSplit: z.number(),
        selectedExportFormat: z.string(),
        removeDuplicates: z.boolean(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      await requireCanViewProject(input.projectId, ctx);

      // Fetch the real data using Prisma
      const loggedCallsFromDb = await ctx.prisma.loggedCallModelResponse.findMany({
        where: {
          originalLoggedCall: {
            projectId: input.projectId,
            id: { in: input.loggedCallIds },
          },
          statusCode: 200,
        },
      });

      // Convert the database data into the desired format
      let formattedLoggedCalls: { instruction: JsonValue[]; output: JsonValue }[] =
        loggedCallsFromDb.map((call) => ({
          instruction: (call.reqPayload as unknown as Record<string, unknown>)
            .messages as JsonValue[],
          output: (call.respPayload as unknown as { choices: { message: unknown }[] }).choices[0]
            ?.message as JsonValue,
        }));

      if (input.removeDuplicates) {
        const deduplicatedLoggedCalls = [];
        const loggedCallHashSet = new Set<string>();
        for (const loggedCall of formattedLoggedCalls) {
          const loggedCallHash = hashObject(loggedCall);
          if (!loggedCallHashSet.has(loggedCallHash)) {
            loggedCallHashSet.add(loggedCallHash);
            deduplicatedLoggedCalls.push(loggedCall);
          }
        }
        formattedLoggedCalls = deduplicatedLoggedCalls;
      }

      // Remove duplicate messages from instructions
      const instructionMessageHashMap = new Map<string, number>();
      for (const loggedCall of formattedLoggedCalls) {
        for (const message of loggedCall.instruction) {
          const hash = hashObject(message);
          if (instructionMessageHashMap.has(hash)) {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            instructionMessageHashMap.set(hash, instructionMessageHashMap.get(hash)! + 1);
          } else {
            instructionMessageHashMap.set(hash, 0);
          }
        }
      }
      for (const loggedCall of formattedLoggedCalls) {
        loggedCall.instruction = loggedCall.instruction.filter((message) => {
          const hash = hashObject(message);
          // If the same message appears in a single instruction multiple times, there is some danger of
          // it being removed from all logged calls. This is enough of an edge case that we don't
          // need to worry about it for now.
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          return instructionMessageHashMap.get(hash)! < formattedLoggedCalls.length;
        });
      }

      // Stringify instructions and outputs
      const stringifiedLoggedCalls = shuffle(formattedLoggedCalls).map((loggedCall) => ({
        instruction: JSON.stringify(loggedCall.instruction),
        output: JSON.stringify(loggedCall.output),
      }));

      const splitIndex = Math.floor((stringifiedLoggedCalls.length * input.testingSplit) / 100);

      const testingData = stringifiedLoggedCalls.slice(0, splitIndex);
      const trainingData = stringifiedLoggedCalls.slice(splitIndex);

      // Convert arrays to JSONL format
      const trainingDataJSONL = trainingData.map((item) => JSON.stringify(item)).join("\n");
      const testingDataJSONL = testingData.map((item) => JSON.stringify(item)).join("\n");

      const output = new WritableStreamBuffer();
      const archive = archiver("zip");

      archive.pipe(output);
      archive.append(trainingDataJSONL, { name: "train.jsonl" });
      archive.append(testingDataJSONL, { name: "test.jsonl" });
      await archive.finalize();

      // Convert buffer to base64
      const base64 = output.getContents().toString("base64");

      return base64;
    }),
});
