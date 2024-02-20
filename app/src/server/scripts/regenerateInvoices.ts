import { prisma } from "../db";
import { generateInvoices } from "../tasks/generateInvoices.task";

//Delete all existing invoices
await prisma.invoice.deleteMany({
  where: { OR: [{ status: "UNPAID" }, { status: "CANCELLED" }] }, //Keep paid invoices
});

console.log("Invoices deleted successfully. Generating new invoices.");

await generateInvoices.enqueue({});
