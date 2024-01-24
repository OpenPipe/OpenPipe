import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { kysely, prisma } from "~/server/db";
import { v4 as uuidv4 } from "uuid";
import { requireCanViewProject } from "~/utils/accessControl";
import { toUTC } from "~/utils/dayjs";
import { success } from "~/utils/errorHandling/standardResponses";
import { getStats } from "./usage.router";
import { TRPCError } from "@trpc/server";
import { sql } from "kysely";
import { calculateSpendingsWithCredits } from "~/utils/billing";

export const invoicesRouter = createTRPCRouter({
  list: protectedProcedure
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

      return invoices;
    }),
  get: protectedProcedure
    .input(
      z.object({
        invoiceId: z.string(),
      }),
    )
    .query(async ({ input, ctx }) => {
      const invoice = await prisma.invoice.findUnique({
        where: { id: input.invoiceId },
      });

      if (!invoice) throw new TRPCError({ message: "Invoice not found", code: "NOT_FOUND" });

      await requireCanViewProject(invoice.projectId, ctx);

      return invoice;
    }),
  // This endpoint is for testing purposes only. It should be refactored and executed as a cron job.
  create: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      await requireCanViewProject(input.projectId, ctx);

      await kysely.transaction().execute(async (tx) => {
        const [startOfPreviousMonth, endOfPreviousMonth] = getPreviousMonthPeriod();

        // 1. Create empty invoice
        const invoice = await tx
          .insertInto("Invoice")
          .values({
            id: uuidv4(),
            projectId: input.projectId,
            amount: 0,
            slug: "#OP-" + generateRandomString(6),
            billingPeriod: getPreviousMonthWithYearString(),
          })
          .returning(["id", "createdAt", "slug"])
          .executeTakeFirst();

        // 2. Associate stats with invoice
        if (invoice) {
          await tx
            .updateTable("UsageLog")
            .set({
              invoiceId: invoice.id,
            })
            .where("projectId", "=", input.projectId)
            .where("createdAt", ">=", startOfPreviousMonth)
            .where("createdAt", "<=", endOfPreviousMonth)
            .execute();

          // 3. Calculate usage stats
          const stats = await getStats(
            tx.selectFrom("UsageLog as ul").where("ul.invoiceId", "=", invoice.id),
          );

          // 4. Calculate available credits
          const creditsAvailable = await tx
            .selectFrom("CreditAdjustment as ca")
            .where("ca.projectId", "=", input.projectId)
            .where("ca.createdAt", "<=", endOfPreviousMonth)
            .select(({ fn }) => fn.sum(sql<number>`amount`).as("amount"))
            .executeTakeFirst();

          if (stats && creditsAvailable) {
            // 5. Calculate total spend
            const { totalSpent, creditsUsed, remainingCredits } = calculateSpendingsWithCredits(
              Number(stats?.cost ?? 0),
              Number(creditsAvailable.amount ?? 0),
            );

            // 5. Update invoice
            await tx
              .updateTable("Invoice")
              .set({
                amount: totalSpent,
                status: totalSpent > 0 ? "PENDING" : "PAID",
                description: JSON.stringify(
                  getDescription({
                    totalInferenceSpend: Number(stats?.totalInferenceSpend ?? 0),
                    totalTrainingSpend: Number(stats?.totalTrainingSpend ?? 0),
                    totalInputTokens: Number(stats?.totalInputTokens ?? 0),
                    totalOutputTokens: Number(stats?.totalOutputTokens ?? 0),
                    totalTrainingTokens: Number(stats?.totalTrainingTokens ?? 0),
                    creditsUsed,
                    remainingCredits,
                  }),
                ),
              })
              .where("id", "=", invoice.id)
              .execute();

            // 6. Create negative credit adjustment if credits were used
            if (creditsUsed > 0) {
              await tx
                .insertInto("CreditAdjustment")
                .values({
                  id: uuidv4(),
                  projectId: input.projectId,
                  amount: -creditsUsed,
                  createdAt: endOfPreviousMonth,
                  description: `Invoice #${invoice.slug}`,
                  invoiceId: invoice.id,
                  type: "INVOICE",
                })
                .execute();
            }
          }
        }
      });

      function getPreviousMonthPeriod(): [Date, Date] {
        const startOfPreviousMonth = toUTC(new Date())
          .subtract(1, "month")
          .startOf("month")
          .toDate();
        const endOfPreviousMonth = toUTC(new Date()).subtract(1, "month").endOf("month").toDate();
        return [startOfPreviousMonth, endOfPreviousMonth];
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
        creditsUsed: number;
        remainingCredits: number;
      }) {
        const totalTokends = stats.totalInputTokens + stats.totalOutputTokens;

        const description = [
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

        const creditsUsedDescription = {
          text: "Credits used",
          value: "-$" + stats.creditsUsed.toFixed(2),
          description: "Remaining credits: $" + stats.remainingCredits.toFixed(2),
        };

        return description.concat(stats.creditsUsed > 0 ? creditsUsedDescription : []);
      }

      return success("Successfully created invoice");
    }),
});
