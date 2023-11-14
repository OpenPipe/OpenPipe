import { sql } from "kysely";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { kysely } from "~/server/db";
import { requireCanViewProject } from "~/utils/accessControl";
import dayjs from "~/utils/dayjs";

export const usageRouter = createTRPCRouter({
  stats: protectedProcedure
    .input(
      z.object({
        // TODO: actually take startDate into account
        startDate: z.string().optional(),
        projectId: z.string(),
      }),
    )
    .query(async ({ input, ctx }) => {
      await requireCanViewProject(input.projectId, ctx);
      // Return the stats group by hour
      const periods = await kysely
        .selectFrom("LoggedCall")
        .leftJoin(
          "LoggedCallModelResponse",
          "LoggedCall.id",
          "LoggedCallModelResponse.originalLoggedCallId",
        )
        .where("projectId", "=", input.projectId)
        .select(({ fn }) => [
          sql<Date>`date_trunc('day', "LoggedCallModelResponse"."requestedAt")`.as("period"),
          sql<number>`count("LoggedCall"."id")::int`.as("numQueries"),
          fn.sum(fn.coalesce("LoggedCallModelResponse.cost", sql<number>`0`)).as("cost"),
        ])
        .groupBy("period")
        .orderBy("period")
        .execute();

      let originalDataIndex = periods.length - 1;
      // *SLAMS DOWN GLASS OF WHISKEY* timezones, amirite?
      let dayToMatch = dayjs(input.startDate || new Date());
      // Ensure that the initial date we're matching against is never before the first period
      if (
        periods[originalDataIndex] &&
        dayToMatch.isBefore(periods[originalDataIndex]?.period, "day")
      ) {
        dayToMatch = dayjs(periods[originalDataIndex]?.period);
      }
      const backfilledPeriods: typeof periods = [];

      // Backfill from now to 14 days ago or the date of the first logged call, whichever is earlier
      while (
        backfilledPeriods.length < 14 ||
        (periods[0]?.period && !dayToMatch.isBefore(periods[0]?.period, "day"))
      ) {
        const nextOriginalPeriod = periods[originalDataIndex];
        if (nextOriginalPeriod && dayjs(nextOriginalPeriod?.period).isSame(dayToMatch, "day")) {
          backfilledPeriods.unshift(nextOriginalPeriod);
          originalDataIndex--;
        } else {
          backfilledPeriods.unshift({
            period: dayjs(dayToMatch).toDate(),
            numQueries: 0,
            cost: 0,
          });
        }
        dayToMatch = dayToMatch.subtract(1, "day");
      }

      const totals = await kysely
        .selectFrom("LoggedCall")
        .leftJoin(
          "LoggedCallModelResponse",
          "LoggedCall.id",
          "LoggedCallModelResponse.originalLoggedCallId",
        )
        .where("projectId", "=", input.projectId)
        .select(({ fn }) => [
          fn.sum(fn.coalesce("LoggedCallModelResponse.cost", sql<number>`0`)).as("cost"),
          fn.count("LoggedCall.id").as("numQueries"),
        ])
        .executeTakeFirst();

      const errors = await kysely
        .selectFrom("LoggedCall")
        .where("projectId", "=", input.projectId)
        .leftJoin(
          "LoggedCallModelResponse",
          "LoggedCall.id",
          "LoggedCallModelResponse.originalLoggedCallId",
        )
        .select(({ fn }) => [fn.count("LoggedCall.id").as("count"), "statusCode as code"])
        .where("statusCode", ">", 200)
        .groupBy("code")
        .orderBy("count", "desc")
        .execute();

      const namedErrors = errors.map((e) => {
        if (e.code === 429) {
          return { ...e, name: "Rate limited" };
        } else if (e.code === 500) {
          return { ...e, name: "Internal server error" };
        } else {
          return { ...e, name: "Other" };
        }
      });

      return { periods: backfilledPeriods, totals, errors: namedErrors };
    }),
});
