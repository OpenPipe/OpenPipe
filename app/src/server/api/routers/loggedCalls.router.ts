import { z } from "zod";
import { type Expression, type SqlBool, sql } from "kysely";
import { jsonArrayFrom } from "kysely/helpers/postgres";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { kysely, prisma } from "~/server/db";
import { comparators, defaultFilterableFields } from "~/state/logFiltersSlice";
import { requireCanViewProject } from "~/utils/accessControl";

// create comparator type based off of comparators
const comparatorToSqlValue = (comparator: (typeof comparators)[number], value: string) => {
  switch (comparator) {
    case "=":
      return `= '${value}'`;
    case "!=":
      return `IS DISTINCT FROM '${value}'`;
    case "CONTAINS":
      return `LIKE '%${value}%'`;
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

      const tagFilters = input.filters.filter(
        (filter) =>
          !defaultFilterableFields.includes(
            filter.field as (typeof defaultFilterableFields)[number],
          ),
      );

      let updatedBaseQuery = baseQuery;

      for (let i = 0; i < tagFilters.length; i++) {
        const filter = tagFilters[i];
        if (!filter?.value) continue;
        const tableAlias = `lct${i}`;
        updatedBaseQuery = updatedBaseQuery
          .leftJoin(`LoggedCallTag as ${tableAlias}`, (join) =>
            join
              .onRef("lc.id", "=", `${tableAlias}.loggedCallId`)
              .on(`${tableAlias}.name`, "=", filter.field),
          )
          .where(
            sql.raw(`${tableAlias}.value ${comparatorToSqlValue(filter.comparator, filter.value)}`),
          ) as unknown as typeof baseQuery;
      }

      const rawCalls = await updatedBaseQuery
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

      const matchingLogIds = await updatedBaseQuery.select(["lc.id"]).execute();

      const count = matchingLogIds.length;

      return { calls, count, matchingLogIds: matchingLogIds.map((log) => log.id) };
    }),
  getTagNames: protectedProcedure
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
        orderBy: {
          name: "asc",
        },
      });

      return tags.map((tag) => tag.name);
    }),
});
