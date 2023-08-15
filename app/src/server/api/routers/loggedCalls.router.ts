import { z } from "zod";
import { type Expression, type SqlBool } from "kysely";
import { sql } from "kysely";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { kysely, prisma } from "~/server/db";
import { comparators } from "~/state/logFiltersSlice";
import { requireCanViewProject } from "~/utils/accessControl";

const defaultFilterableFields = ["Request", "Response", "Model"];

const comparatorToSql = {
  "=": "=",
  "!=": "!=",
  CONTAINS: "like",
} as const;

export const loggedCallsRouter = createTRPCRouter({
  list: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        page: z.number(),
        pageSize: z.number(),
        filters: z.array(
          z.object({
            field: z.string(),
            comparator: z.enum(comparators),
            value: z.string().optional(),
          }),
        ),
      }),
    )
    .query(async ({ input, ctx }) => {
      const { projectId, page, pageSize } = input;

      await requireCanViewProject(projectId, ctx);

      const baseQuery = kysely
        .selectFrom("LoggedCall as lc")
        .leftJoin("LoggedCallModelResponse as lcmr", "lc.id", "lcmr.originalLoggedCallId")
        .where((eb) => {
          const wheres: Expression<SqlBool>[] = [eb("lc.projectId", "=", projectId)];

          for (const filter of input.filters) {
            if (!filter.value) continue;
            if (filter.field === "Request") {
              wheres.push(sql.raw(`lcmr."reqPayload"::text like '%${filter.value}%'`));
            }
          }

          return eb.and(wheres);
        });

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
        ])
        .orderBy("lc.requestedAt", "desc")
        .limit(pageSize)
        .offset((page - 1) * pageSize)
        .execute();

      const calls = rawCalls.map((rawCall) => ({
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
      }));

      const matchingLogIds = await baseQuery.select(["lc.id"]).execute();

      const count = matchingLogIds.length;

      return { calls, count, matchingLogIds: matchingLogIds.map((log) => log.id) };

      // const whereClauses: Prisma.LoggedCallWhereInput[] = [{ projectId }];

      // for (const filter of input.filters) {
      //   if (!filter.value) continue;
      //   if (filter.field === "Request") {
      //     console.log("filter.value is", filter.value);
      //     whereClauses.push({
      //       modelResponse: {
      //         is: {
      //           reqPayload: {
      //             string_contains: filter.value,
      //           },
      //         },
      //       },
      //     });
      //   }
      // }

      // const calls = await prisma.loggedCall.findMany({
      //   where: { AND: whereClauses },
      //   orderBy: { requestedAt: "desc" },
      //   include: { tags: true, modelResponse: true },
      //   skip: (page - 1) * pageSize,
      //   take: pageSize,
      // });

      // const matchingLogs = await prisma.loggedCall.findMany({
      //   where: { AND: whereClauses },
      //   select: { id: true },
      // });

      // const count = await prisma.loggedCall.count({
      //   where: { AND: whereClauses },
      // });

      // return { calls, count, matchingLogIds: matchingLogs.map((log) => log.id) };
    }),
  getFilterableFields: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ input, ctx }) => {
      await requireCanViewProject(input.projectId, ctx);

      const tags = await prisma.loggedCallTag.findMany({
        distinct: ["name"],
        where: {
          projectId: input.projectId,
        },
        select: {
          name: true,
        },
      });

      return [...defaultFilterableFields, ...tags.map((tag) => tag.name)];
    }),
});
