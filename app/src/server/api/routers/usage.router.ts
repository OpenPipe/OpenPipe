import { sql } from "kysely";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { kysely } from "~/server/db";
import { typedFineTune } from "~/types/dbColumns.types";
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
      const baseQuery = kysely
        .selectFrom("UsageLog as ul")
        .where("ul.projectId", "=", input.projectId);

      const finetunesQuery = kysely
        .selectFrom(
          kysely
            .selectFrom("UsageLog as ul")
            .innerJoin("FineTune as ft", "ft.id", "ul.fineTuneId")
            .where("ft.projectId", "=", input.projectId)
            .select(({ fn }) => [
              "ft.id as ftId",
              fn
                .sum(sql<number>`case when ul.type = 'TRAINING' then 0 else 1 end`)
                .as("numQueries"),
              fn
                .sum(sql<number>`case when ul.type = 'TRAINING' then 0 else ul."inputTokens" end`)
                .as("inputTokens"),
              fn
                .sum(sql<number>`case when ul.type = 'TRAINING' then 0 else ul."outputTokens" end`)
                .as("outputTokens"),
              fn
                .sum(sql<number>`case when ul.billable = false then 0 else ul."cost" end`)
                .as("cost"),
            ])
            .groupBy("ftId")
            .as("stats"),
        )
        .innerJoin("FineTune as ft", "ft.id", "stats.ftId")
        .selectAll("stats")
        .select(["ft.baseModel", "ft.provider", "ft.slug"])
        .orderBy("numQueries", "desc");

      const [periods, totals, fineTunes] = await Promise.all([
        // Return the stats group by hour
        baseQuery
          .select((eb) => [
            sql<Date>`date_trunc('day', "ul"."createdAt")`.as("period"),
            sql<number>`count("ul"."id")::int`.as("numQueries"),
            eb.fn
              .sum(sql<number>`case when ul.type = 'TRAINING' then ul.cost else 0 end`)
              .as("trainingCost"),
            eb.fn
              .sum(
                sql<number>`case when ul.type != 'TRAINING' and ul.billable = true then ul.cost else 0 end`,
              )
              .as("inferenceCost"),
          ])
          .groupBy("period")
          .orderBy("period")
          .execute(),
        baseQuery
          .select(({ fn }) => [
            fn.sum(sql<number>`case when ul.billable = false then 0 else ul."cost" end`).as("cost"),
            fn.count("ul.id").as("numQueries"),
          ])
          .executeTakeFirst(),
        finetunesQuery.select("ft.createdAt").execute(),
      ]);

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
            trainingCost: 0,
            inferenceCost: 0,
          });
        }
        dayToMatch = dayToMatch.subtract(1, "day");
      }

      return { periods: backfilledPeriods, totals, fineTunes: fineTunes.map(typedFineTune) };
    }),
});
