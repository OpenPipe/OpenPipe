import defineTask from "./defineTask";
import { kysely, prisma } from "~/server/db";
import { v4 as uuidv4 } from "uuid";
import dayjs, {
  getPreviousMonthPeriodUTC,
  getPreviousMonthWithYearString,
  toUTC,
} from "~/utils/dayjs";
import { sql } from "kysely";
import { calculateSpendingsWithCredits } from "~/utils/billing";
import { getStats } from "../api/routers/usage.router";

export const generateInvoices = defineTask({
  id: "generateInvoices",
  handler: async () => {
    const [startOfPreviousMonth, endOfPreviousMonth] = getPreviousMonthPeriodUTC();

    const projects = await prisma.project.findMany();

    for (const project of projects) {
      if (project.billable) {
        await createInvoice(project.id, new Date(2010), endOfPreviousMonth);
      }
    }
  },
  specDefaults: {
    priority: 5,
  },
});

export async function createInvoice(projectId: string, startDate: Date, endDate: Date) {
  // Avoid creating multiple invoices for the same billing period

  // const invoiceAlreadyExists = await prisma.invoice.findFirst({
  //   where: {
  //     projectId: projectId,
  //     billingPeriod: getPreviousMonthWithYearString(),
  //     createdAt: {
  //       gte: toUTC(new Date()).startOf("month").toDate(),
  //     },
  //   },
  // });

  // if (invoiceAlreadyExists) return;

  await kysely.transaction().execute(async (tx) => {
    // TODO: remove this temp logic
    const project = await tx
      .selectFrom("Project")
      .where("id", "=", projectId)
      .select(["createdAt"])
      .executeTakeFirst();

    const existingInvoice = await tx
      .selectFrom("Invoice")
      .where("projectId", "=", projectId)
      .executeTakeFirst();

    if (!project || existingInvoice) return;
    // TODO: remove this temp logic

    // 1. Create empty invoice
    const invoice = await tx
      .insertInto("Invoice")
      .values({
        id: uuidv4(),
        projectId: projectId,
        amount: 0,
        slug: generateInvoiceSlug(),
        billingPeriod:
          toUTC(new Date(project.createdAt)).format("MMM YYYY") +
          " - " +
          getPreviousMonthWithYearString(),
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
        .where("projectId", "=", projectId)
        .where("createdAt", ">=", startDate)
        .where("createdAt", "<=", endDate)
        .execute();

      // 3. Calculate usage stats
      const stats = await getStats(
        tx.selectFrom("UsageLog as ul").where("ul.invoiceId", "=", invoice.id),
      );

      // 4. Calculate available credits
      const creditsAvailable = await tx
        .selectFrom("CreditAdjustment as ca")
        .where("ca.projectId", "=", projectId)
        .where("ca.createdAt", "<=", endDate)
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
            status: totalSpent >= 1 ? "PENDING" : "CANCELLED", // Minimum $1 charge
            description: JSON.stringify(
              getInvoiceDescription({
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
              projectId: projectId,
              amount: -creditsUsed,
              //Adjustments should be created on the first day of the next month, when invoices are generated
              createdAt: dayjs(endDate).add(1, "month").startOf("month").toDate(),
              description: `Invoice ${invoice.slug}`,
              invoiceId: invoice.id,
              type: "INVOICE",
            })
            .execute();
        }
      }
    }
  });
}

function generateInvoiceSlug(length = 6) {
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const slug = Array.from({ length }, () =>
    characters.charAt(Math.floor(Math.random() * characters.length)),
  ).join("");

  return "#OP-" + slug;
}

function getInvoiceDescription(stats: {
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
        Number(stats.totalInferenceSpend ?? 0) / Number(totalTokends ?? 0)
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
