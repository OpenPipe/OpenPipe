import { prisma } from "../db";

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
      status: "CANCELLED",
      id: {
        not: invoice.id,
      },
    },
  });

  for (const duplicateInvoice of duplicateInvoices) {
    await prisma.invoice.delete({
      where: {
        id: duplicateInvoice.id,
      },
    });
    deletedInvoiceIds.add(duplicateInvoice.id); // Add the deleted invoice ID to the set
  }
}
