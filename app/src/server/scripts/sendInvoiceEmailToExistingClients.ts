import { prisma } from "../db";
import { sendInvoiceNotificationWithoutRequiredPayment } from "../emails/sendInvoiceNotificationWithoutRequiredPayment";
import { sendToOwner } from "../emails/sendToOwner";

console.log("Doing: sending emiails");

//Neagative credits mean that the servcie was used
const creditAdjustments = await prisma.creditAdjustment.findMany({
  where: {
    amount: {
      lt: 0,
    },
  },
  include: {
    invoice: true,
    project: true,
  },
});

for (const creditAdjustment of creditAdjustments) {
  const invoice = creditAdjustment.invoice;
  const project = creditAdjustment.project;

  // Searching for pending invoices, and invoices with usage, but covered by credits
  // amount > -100 means that the credits covered all the usage
  if (
    project.billable &&
    invoice &&
    (invoice.status === "PENDING" || Number(creditAdjustment.amount) > -100)
  ) {
    await sendToOwner(invoice.projectId, (email: string) =>
      sendInvoiceNotificationWithoutRequiredPayment(
        invoice.id,
        Number(invoice.amount),
        invoice.description,
        invoice.billingPeriod || "",
        project.name,
        project.slug,
        email,
      ),
    );
  }
}

console.log("Sent!");
