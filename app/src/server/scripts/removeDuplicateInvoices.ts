import dayjs from "dayjs";
import { kysely, prisma } from "../db";

const startOfFeb2024 = dayjs("2024-02-01").startOf("month").toDate();
const endOfFeb2024 = dayjs("2024-02-01").endOf("month").toDate();

const invoices = await prisma.invoice.findMany({
  where: {
    billingPeriod: "Feb 2024",
  },
});

const deletedInvoiceIds = new Set();

for (const invoice of invoices) {
  if (deletedInvoiceIds.has(invoice.id)) {
    continue; // Skip this invoice if it has been deleted
  }

  const duplicateInvoices = await prisma.invoice.findMany({
    where: {
      projectId: invoice.projectId,
      billingPeriod: invoice.billingPeriod,
      id: {
        not: invoice.id,
      },
    },
  });

  for (const duplicateInvoice of duplicateInvoices) {
    console.log(`Deleting duplicate invoice ${duplicateInvoice.id}`);
    await prisma.invoice.delete({
      where: {
        id: duplicateInvoice.id,
      },
    });
    deletedInvoiceIds.add(duplicateInvoice.id); // Add the deleted invoice ID to the set
  }
}

const invoices2 = await prisma.invoice.findMany({
  where: {
    billingPeriod: "Feb 2024",
  },
});

for (const invoice of invoices2) {
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
