import { sql } from "kysely";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { kysely, prisma } from "~/server/db";
import { v4 as uuidv4 } from "uuid";
import { requireCanViewProject } from "~/utils/accessControl";
import { toUTC } from "~/utils/dayjs";
import { success } from "~/utils/errorHandling/standardResponses";
import { getStats } from "./usage.router";

export const billingRouter = createTRPCRouter({
  invoices: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
      }),
    )
    .query(async ({ input, ctx }) => {
      await requireCanViewProject(input.projectId, ctx);

      const invoices = await kysely
        .selectFrom("Invoice as i")
        .where("i.projectId", "=", input.projectId)
        .orderBy("i.createdAt", "desc")
        .selectAll()
        .execute();

      return { invoices };
    }),
  invoice: protectedProcedure
    .input(
      z.object({
        invoiceId: z.string(),
      }),
    )
    .query(async ({ input, ctx }) => {
      const invoice = await prisma.invoice.findUniqueOrThrow({
        where: { id: input.invoiceId },
      });

      await requireCanViewProject(invoice.projectId, ctx);

      return { invoice };
    }),
  // This endpoint is for testing purposes only. It should be refactored and executed as a cron job.
  createInvoice: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      await requireCanViewProject(input.projectId, ctx);

      const [startOfLastMonth, endOfPreviousMonth] = getLastMonthPeriod();

      await kysely.transaction().execute(async (tx) => {
        const baseQuery = tx
          .selectFrom("UsageLog as ul")
          .where("ul.projectId", "=", input.projectId)
          .where(sql`"ul"."createdAt"`, ">=", startOfLastMonth)
          .where(sql`"ul"."createdAt"`, "<=", endOfPreviousMonth);

        const stats = await getStats(baseQuery);

        // 2. Create invoice
        const invoice = await tx
          .insertInto("Invoice")
          .values({
            id: uuidv4(),
            projectId: input.projectId,
            amount: Number(stats?.cost ?? 0),
            slug: "#OP-" + generateRandomString(6),
            billingPeriod: getPreviousMonthWithYearString(),
            description: JSON.stringify(
              getDescription({
                totalInferenceSpend: Number(stats?.totalInferenceSpend ?? 0),
                totalTrainingSpend: Number(stats?.totalTrainingSpend ?? 0),
                totalInputTokens: Number(stats?.totalInputTokens ?? 0),
                totalOutputTokens: Number(stats?.totalOutputTokens ?? 0),
                totalTrainingTokens: Number(stats?.totalTrainingTokens ?? 0),
              }),
            ),
          })
          .returning("id")
          .executeTakeFirst();

        // 3. Associate stats with invoice
        if (invoice) {
          await tx
            .updateTable("UsageLog")
            .set({
              invoiceId: invoice.id,
            })
            .where("projectId", "=", input.projectId)
            .where("createdAt", ">=", startOfLastMonth)
            .where("createdAt", "<=", endOfPreviousMonth)
            .execute();
        }
      });

      function getLastMonthPeriod(): [Date, Date] {
        const startOfLastMonth = toUTC(new Date()).subtract(1, "month").startOf("month").toDate();
        const endOfPreviousMonth = toUTC(new Date()).subtract(1, "month").endOf("month").toDate();
        return [startOfLastMonth, endOfPreviousMonth];
      }

      function generateRandomString(length: number) {
        const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        return Array.from({ length }, () =>
          characters.charAt(Math.floor(Math.random() * characters.length)),
        ).join("");
      }

      function getPreviousMonthWithYearString() {
        return toUTC(new Date()).subtract(1, "month").format("MMM YYYY");
      }

      function getDescription(stats: {
        totalInferenceSpend: number;
        totalTrainingSpend: number;
        totalInputTokens: number;
        totalOutputTokens: number;
        totalTrainingTokens: number;
      }) {
        const totalTokends = stats.totalInputTokens + stats.totalOutputTokens;
        return [
          {
            text: "Total inference spend",
            value: "$" + stats.totalInferenceSpend.toFixed(2),
            description: `Tokens: ${totalTokends.toLocaleString()} ($${(
              stats.totalInferenceSpend / totalTokends
            ).toFixed(7)}/token) \n 
          Input tokens: ${stats.totalInputTokens.toLocaleString()} \n
          Output tokens: ${stats.totalOutputTokens.toLocaleString()}`,
          },
          {
            text: "Total training spend",
            value: "$" + stats.totalTrainingSpend.toFixed(2),
            description: "Training tokens: " + stats.totalTrainingTokens.toLocaleString(),
          },
        ];
      }

      return success("Successfully created invoice");
    }),
});
