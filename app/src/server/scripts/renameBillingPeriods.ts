import { prisma } from "../db";

const invoices = await prisma.invoice.findMany({});

for (const invoice of invoices) {
  if (invoice.billingPeriod) {
    const dates = invoice.billingPeriod.split(" - ");

    if (dates[0] === dates[1]) {
      await prisma.invoice.update({
        where: {
          id: invoice.id,
        },
        data: {
          billingPeriod: dates[0],
        },
      });
    }
  }
}

console.log("Done!");
