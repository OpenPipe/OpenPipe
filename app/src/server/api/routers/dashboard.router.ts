import { sql } from "kysely";
import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { kysely, prisma } from "~/server/db";

export const dashboardRouter = createTRPCRouter({
  stats: publicProcedure
    .input(
      z.object({
        startDate: z.string().optional(),
        organizationId: z.string(),
      }),
    )
    .query(async ({ input }) => {
      console.log("made it 1");
      // Return the stats group by hour
      const periods = await kysely
        .selectFrom("LoggedCall")
        .leftJoin(
          "LoggedCallModelResponse",
          "LoggedCall.id",
          "LoggedCallModelResponse.originalLoggedCallId",
        )
        .where("organizationId", "=", input.organizationId)
        .select(({ fn }) => [
          sql<Date>`date_trunc('day', "LoggedCallModelResponse"."startTime")`.as("period"),
          sql<number>`count("LoggedCall"."id")::int`.as("numQueries"),
          fn.sum(fn.coalesce('LoggedCallModelResponse.totalCost', sql<number>`0`)).as("totalCost"),
        ])
        .groupBy("period")
        .orderBy("period")
        .execute();

      console.log("made it 2");

      const totals = await kysely
        .selectFrom("LoggedCall")
        .where("organizationId", "=", input.organizationId)
        .leftJoin(
          "LoggedCallModelResponse",
          "LoggedCall.id",
          "LoggedCallModelResponse.originalLoggedCallId",
        )
        .select(({ fn }) => [
          fn.sum(fn.coalesce('LoggedCallModelResponse.totalCost', sql<number>`0`)).as("totalCost"),
          fn.count("id").as("numQueries"),
        ])
        .executeTakeFirst();

      console.log("made it 3");

      const errors = await kysely
        .selectFrom("LoggedCall")
        .where("organizationId", "=", input.organizationId)
        .leftJoin(
          "LoggedCallModelResponse",
          "LoggedCall.id",
          "LoggedCallModelResponse.originalLoggedCallId",
        )
        .select(({ fn }) => [fn.count("id").as("count"), "respStatus as code"])
        .where("respStatus", ">", 200)
        .groupBy("code")
        .orderBy("count", "desc")
        .execute();

      console.log("made it 4");

      const namedErrors = errors.map((e) => {
        if (e.code === 429) {
          return { ...e, name: "Rate limited" };
        } else if (e.code === 500) {
          return { ...e, name: "Internal server error" };
        } else {
          return { ...e, name: "Other" };
        }
      });

      console.log("data is", { periods, totals, errors: namedErrors });

      return { periods, totals, errors: namedErrors };
      // const resp = await kysely.selectFrom("LoggedCall").selectAll().execute();
    }),

  // TODO useInfiniteQuery
  // https://discord.com/channels/966627436387266600/1122258443886153758/1122258443886153758
  loggedCalls: publicProcedure.input(z.object({})).query(async ({ input }) => {
    const loggedCalls = await prisma.loggedCall.findMany({
      orderBy: { startTime: "desc" },
      include: { tags: true, modelResponse: true },
      take: 20,
    });

    return loggedCalls;
  }),
});
