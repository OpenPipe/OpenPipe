import { z } from "zod";
import { type Expression, type SqlBool } from "kysely";
import { sql } from "kysely";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { kysely, prisma } from "~/server/db";
import { comparators } from "~/state/logFiltersSlice";
import { requireCanViewProject } from "~/utils/accessControl";

const defaultFilterableFields = ["Request", "Response", "Model", "Status Code"];

// create comparator type based off of comparators
const comparatorToSqlValue = (comparator: (typeof comparators)[number], value: string) => {
  switch (comparator) {
    case "=":
      return `= '${value}'`;
    case "!=":
      return `!= '${value}'`;
    case "CONTAINS":
      return `like '%${value}%'`;
  }
};

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
              wheres.push(
                sql.raw(
                  `lcmr."reqPayload"::text ${comparatorToSqlValue(
                    filter.comparator,
                    filter.value,
                  )}`,
                ),
              );
            }
            if (filter.field === "Response") {
              wheres.push(
                sql.raw(
                  `lcmr."respPayload"::text ${comparatorToSqlValue(
                    filter.comparator,
                    filter.value,
                  )}`,
                ),
              );
            }
            if (filter.field === "Model") {
              wheres.push(
                sql.raw(`lc."model" ${comparatorToSqlValue(filter.comparator, filter.value)}`),
              );
            }
            if (filter.field === "Status Code") {
              wheres.push(
                sql.raw(
                  `lcmr."statusCode"::text ${comparatorToSqlValue(
                    filter.comparator,
                    filter.value,
                  )}`,
                ),
              );
            }
          }

          return eb.and(wheres);
        });

      const rawCalls = await baseQuery
        .select([
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
