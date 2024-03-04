import dayjs from "dayjs";
import { kysely, prisma } from "../db";

const startOfFeb2024 = dayjs("2024-02-01").startOf("month").toDate();
const endOfFeb2024 = dayjs("2024-02-01").endOf("month").toDate();

const invoices = await prisma.invoice.findMany({
  where: {
    billingPeriod: "Feb 2024",
  },
});

for (const invoice of invoices) {
  await kysely
    .updateTable("UsageLog")
    .set({
      invoiceId: invoice.id,
    })
    .where("projectId", "=", invoice.projectId)
    .where("createdAt", ">=", startOfFeb2024)
    .where("createdAt", "<=", endOfFeb2024)
    .where("invoiceId", "is", null)
    .execute();
}
