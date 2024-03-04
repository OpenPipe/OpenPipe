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
import { chargeInvoice } from "./chargeInvoices.task";
import { sendInvoiceNotification } from "../emails/sendInvoiceNotification";
import { sendToOwner } from "../emails/sendToOwner";

export const generateInvoices = defineTask({
  id: "generateInvoices",
  handler: async () => {
    const [startOfPreviousMonth, endOfPreviousMonth] = getPreviousMonthPeriodUTC();

    const projects = await prisma.project.findMany({ where: { billable: true } });

    for (const project of projects) {
      const data = await createInvoice(project.id, startOfPreviousMonth, endOfPreviousMonth);

      if (data?.invoice) {
        await chargeInvoice(data.invoice.id);
      }

      //Send success email if a user spent credits but does not have to pay.
      if (data && data.creditsUsed > 0 && Number(data.invoice.amount) <= 1) {
        await sendToOwner(data.invoice.projectId, (email: string) =>
          sendInvoiceNotification(
            data.invoice.id,
            Number(data.invoice.amount),
            data.invoice.description,
            data.invoice.billingPeriod || "",
            project.name,
            project.slug,
            email,
          ),
        );
      }
    }
  },
  specDefaults: {
    priority: 5,
  },
});

export async function createInvoice(projectId: string, startDate: Date, endDate: Date) {
  return await kysely.transaction().execute(async (tx) => {
    const existingInvoice = await tx
      .selectFrom("Invoice")
      .where("projectId", "=", projectId)
      .where("createdAt", ">=", toUTC(new Date()).startOf("month").toDate())
      .where("billingPeriod", "=", getPreviousMonthWithYearString())
      .executeTakeFirst();

    if (existingInvoice) return;
    // 1. Create empty invoice
    let invoice = await tx
      .insertInto("Invoice")
      .values({
        id: uuidv4(),
        projectId: projectId,
        amount: 0,
        slug: generateInvoiceSlug(),
        billingPeriod: getPreviousMonthWithYearString(),
      })
      .returning([
        "id",
        "createdAt",
        "slug",
        "amount",
        "billingPeriod",
        "status",
        "description",
        "projectId",
      ])
      .executeTakeFirst();

    if (!invoice) throw new Error("No data available for invoice generation");

    // 2. Associate stats with invoice
    await tx
      .updateTable("UsageLog")
      .set({
        invoiceId: invoice.id,
      })
      .where("projectId", "=", projectId)
      .where("createdAt", ">=", startDate)
      .where("createdAt", "<=", endDate)
      .where("invoiceId", "is", null)
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

    if (!stats || !creditsAvailable) {
      throw new Error("No data available for invoice generation");
    }
    // 5. Calculate total spend
    const { totalSpent, creditsUsed, remainingCredits } = calculateSpendingsWithCredits(
      Number(stats?.cost ?? 0),
      Number(creditsAvailable.amount ?? 0),
    );

    // 6. Update invoice
    invoice = await tx
      .updateTable("Invoice")
      .set({
        amount: totalSpent,
        status: totalSpent >= 1 ? "UNPAID" : "CANCELLED", // Minimum $1 charge
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
      .returning([
        "id",
        "createdAt",
        "slug",
        "amount",
        "billingPeriod",
        "status",
        "description",
        "projectId",
      ])
      .executeTakeFirst();
    if (!invoice) throw new Error("No data available for invoice generation");

    // 6. Create negative credit adjustment if credits were used
    if (invoice && creditsUsed > 0) {
      await tx
        .insertInto("CreditAdjustment")
        .values({
          id: uuidv4(),
          projectId: projectId,
          amount: -creditsUsed,
          // Adjustments should be created on the first day of the next month, when invoices are generated
          createdAt: dayjs(endDate).add(1, "month").startOf("month").toDate(),
          description: `Invoice ${invoice.slug}`,
          invoiceId: invoice.id,
          type: "INVOICE",
        })
        .execute();
    }

    return { invoice, creditsUsed };
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
